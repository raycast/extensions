import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  LocalStorage,
  List,
  open,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { loadRules, saveRules, getDefaultBrowser, setDefaultBrowser } from "./storage";
import { Rule } from "./types";
import { expandTilde } from "./utils/path";
import { generateFinickyConfig, writeConfigFile } from "./utils/finicky";
import { parseFinickyConfig } from "./utils/parser";
import { getInstalledBrowsers, Browser } from "./utils/browsers";
import fs from "fs/promises";

function uuid(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const IMPORT_DISMISSED_KEY = "importDismissed";

async function isImportDismissed(): Promise<boolean> {
  return (await LocalStorage.getItem<string>(IMPORT_DISMISSED_KEY)) === "true";
}

async function setImportDismissed(dismissed: boolean): Promise<void> {
  if (dismissed) {
    await LocalStorage.setItem(IMPORT_DISMISSED_KEY, "true");
    return;
  }
  await LocalStorage.removeItem(IMPORT_DISMISSED_KEY);
}

async function syncConfigFile(args: { configPath: string; defaultBrowser: string; rules: Rule[] }) {
  const configPath = expandTilde(args.configPath);
  const contents = generateFinickyConfig({ defaultBrowser: args.defaultBrowser, rules: args.rules });
  await writeConfigFile({ configPath, configContents: contents });
}

function parseExistingPattern(pattern: string) {
  // Parse a pattern like "*://*.google.com/*" into its components
  const protocolMatch = pattern.match(/^(https?|\*):/);
  const protocol = protocolMatch ? (protocolMatch[1] === "*" ? "any" : protocolMatch[1]) : "https";

  // Remove protocol part
  const withoutProtocol = pattern.replace(/^[^:]+:\/\//, "");

  // Split into host and path
  const firstSlash = withoutProtocol.indexOf("/");
  const host = firstSlash === -1 ? withoutProtocol : withoutProtocol.substring(0, firstSlash);
  const pathPart = firstSlash === -1 ? "" : withoutProtocol.substring(firstSlash);

  // Parse subdomain and domain
  let subdomain = "any";
  let customSubdomain = "";
  let domain = host;

  if (host.startsWith("*.")) {
    subdomain = "any";
    domain = host.substring(2);
  } else if (host.startsWith("www.")) {
    subdomain = "www";
    domain = host.substring(4);
  } else if (host.includes(".")) {
    const parts = host.split(".");
    if (parts.length > 2) {
      subdomain = "custom";
      customSubdomain = parts.slice(0, -2).join(".");
      domain = parts.slice(-2).join(".");
    } else {
      subdomain = "none";
      domain = host;
    }
  } else {
    subdomain = "none";
  }

  // Parse path
  let path = "any";
  let customPath = "";

  if (pathPart === "" || pathPart === "/") {
    path = "none";
  } else if (pathPart === "/*") {
    path = "any";
  } else {
    path = "custom";
    customPath = pathPart;
  }

  return { protocol, subdomain, customSubdomain, domain, path, customPath };
}

function RuleForm(props: { title: string; initial?: Rule; onSubmit: (rule: Rule) => Promise<void> }) {
  const { pop } = useNavigation();
  const initial = props.initial;

  // Parse initial pattern if editing and only one pattern exists
  const parsedPattern = initial?.patterns?.[0] ? parseExistingPattern(initial.patterns[0]) : null;
  const shouldUseManualMode = initial && initial.patterns.length > 1;

  const [inputMode, setInputMode] = useState<"guided" | "manual">(shouldUseManualMode ? "manual" : "guided");
  const [protocol, setProtocol] = useState(parsedPattern?.protocol ?? "https");
  const [subdomain, setSubdomain] = useState(parsedPattern?.subdomain ?? "any");
  const [domain, setDomain] = useState(parsedPattern?.domain ?? "");
  const [path, setPath] = useState(parsedPattern?.path ?? "any");
  const [customSubdomain, setCustomSubdomain] = useState(parsedPattern?.customSubdomain ?? "");
  const [customPath, setCustomPath] = useState(parsedPattern?.customPath ?? "");
  const [installedBrowsers, setInstalledBrowsers] = useState<Browser[]>([]);
  const [browserInputMode, setBrowserInputMode] = useState<"dropdown" | "manual">("dropdown");
  const [isLoadingBrowsers, setIsLoadingBrowsers] = useState(true);

  useEffect(() => {
    async function loadBrowsers() {
      try {
        const browsers = await getInstalledBrowsers();
        setInstalledBrowsers(browsers);
      } catch (error) {
        console.error("Failed to detect browsers:", error);
      } finally {
        setIsLoadingBrowsers(false);
      }
    }
    loadBrowsers();
  }, []);

  const generatePattern = () => {
    if (!domain) return "";

    const protocolPart = protocol === "any" ? "*" : protocol;
    const subdomainPart =
      subdomain === "any" ? "*" : subdomain === "none" ? "" : subdomain === "custom" ? customSubdomain : subdomain;
    const domainPart = domain;
    const pathPart = path === "any" ? "/*" : path === "none" ? "" : path === "custom" ? customPath : path;

    const host = subdomainPart ? `${subdomainPart}.${domainPart}` : domainPart;
    return `${protocolPart}://${host}${pathPart}`;
  };

  const previewPattern = generatePattern();

  return (
    <Form
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Rule"
            onSubmit={async (values) => {
              let patterns: string[];

              if (inputMode === "manual") {
                patterns = String(values.patterns ?? "")
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean);
              } else {
                const pattern = generatePattern();
                if (!pattern) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Domain is required",
                  });
                  return;
                }
                patterns = [pattern];
              }

              const rule: Rule = {
                id: initial?.id ?? uuid(),
                name: String(values.name ?? "").trim() || "Untitled Rule",
                enabled: Boolean(values.enabled),
                matchType: inputMode === "guided" ? "wildcards" : (values.matchType as Rule["matchType"]),
                patterns,
                browser: values.browser as string,
              };

              await props.onSubmit(rule);
              pop();
            }}
          />
          <Action
            title={`Switch to ${inputMode === "guided" ? "Manual" : "Guided"} Mode`}
            icon={Icon.Switch}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={() => setInputMode(inputMode === "guided" ? "manual" : "guided")}
          />
          <Action
            title={`${browserInputMode === "dropdown" ? "Enter Browser Manually" : "Select from Detected Browsers"}`}
            icon={Icon.AppWindow}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onAction={() => setBrowserInputMode(browserInputMode === "dropdown" ? "manual" : "dropdown")}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={initial?.name} />
      <Form.Checkbox id="enabled" label="Enabled" defaultValue={initial?.enabled ?? true} />

      {inputMode === "manual" && (
        <Form.Dropdown id="matchType" title="Match Type" defaultValue={initial?.matchType ?? "wildcards"}>
          <Form.Dropdown.Item value="wildcards" title="Wildcards (Finicky match array)" />
          <Form.Dropdown.Item value="regex" title="Regex (tested against full urlString)" />
        </Form.Dropdown>
      )}

      <Form.Separator />

      {inputMode === "guided" ? (
        <>
          <Form.Description text="Build your URL pattern step by step" />

          <Form.Dropdown id="protocol" title="Protocol" value={protocol} onChange={setProtocol}>
            <Form.Dropdown.Item value="any" title="Any (http or https)" />
            <Form.Dropdown.Item value="https" title="HTTPS only" />
            <Form.Dropdown.Item value="http" title="HTTP only" />
          </Form.Dropdown>

          <Form.Dropdown id="subdomain" title="Subdomain" value={subdomain} onChange={setSubdomain}>
            <Form.Dropdown.Item value="any" title="Any subdomain (*.example.com)" />
            <Form.Dropdown.Item value="none" title="No subdomain (example.com)" />
            <Form.Dropdown.Item value="www" title="www only" />
            <Form.Dropdown.Item value="custom" title="Custom subdomain" />
          </Form.Dropdown>

          {subdomain === "custom" && (
            <Form.TextField
              id="customSubdomain"
              title="Custom Subdomain"
              placeholder="mail, app, etc."
              value={customSubdomain}
              onChange={setCustomSubdomain}
            />
          )}

          <Form.TextField id="domain" title="Domain" placeholder="example.com" value={domain} onChange={setDomain} />

          <Form.Dropdown id="path" title="Path" value={path} onChange={setPath}>
            <Form.Dropdown.Item value="any" title="Any path (/*)" />
            <Form.Dropdown.Item value="none" title="No path" />
            <Form.Dropdown.Item value="custom" title="Custom path" />
          </Form.Dropdown>

          {path === "custom" && (
            <Form.TextField
              id="customPath"
              title="Custom Path"
              placeholder="/dashboard, /admin/*, etc."
              value={customPath}
              onChange={setCustomPath}
            />
          )}

          {previewPattern && <Form.Description title="Preview" text={previewPattern} />}
        </>
      ) : (
        <>
          <Form.Description text="Enter URL patterns manually (one per line)" />
          <Form.TextArea
            id="patterns"
            title="Patterns"
            defaultValue={(initial?.patterns ?? []).join("\n")}
            placeholder={`Examples:\n*://*.salesforce.com/*\n*://mail.google.com/*\nhttps://github.com/myorg/*`}
          />
        </>
      )}

      <Form.Separator />

      {browserInputMode === "dropdown" ? (
        <>
          <Form.Dropdown id="browser" title="Open In" defaultValue={initial?.browser} isLoading={isLoadingBrowsers}>
            {installedBrowsers.map((browser) => (
              <Form.Dropdown.Item key={browser.bundleId} value={browser.name} title={browser.name} />
            ))}
          </Form.Dropdown>
          {installedBrowsers.length > 0 && (
            <Form.Description
              text={`${installedBrowsers.length} browser(s) detected. Press Cmd+B to enter manually.`}
            />
          )}
        </>
      ) : (
        <>
          <Form.TextField
            id="browser"
            title="Open In (Browser name)"
            defaultValue={initial?.browser ?? "Arc"}
            placeholder="Examples: Arc, Brave Browser, Safari, Google Chrome"
          />
          <Form.Description text="Press Cmd+B to select from detected browsers." />
        </>
      )}
    </Form>
  );
}

export default function Command() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const preferences = getPreferenceValues<{ configPath?: string }>();
  const configPath = (preferences.configPath ?? "").trim();

  const { push } = useNavigation();

  const sortedRules = useMemo(() => {
    return [...rules].sort((a, b) => a.name.localeCompare(b.name));
  }, [rules]);

  async function refresh() {
    setIsLoading(true);
    const loaded = await loadRules();
    setRules(loaded);
    setIsLoading(false);
  }

  async function checkAndOfferImport() {
    if (!configPath) return;

    const existingRules = await loadRules();
    if (existingRules.length > 0) return;
    if (await isImportDismissed()) return;

    try {
      const expandedPath = expandTilde(configPath);
      await fs.access(expandedPath);

      const shouldImport = await confirmAlert({
        title: "Import Existing Rules?",
        message: `Found existing Finicky config at ${configPath}. Would you like to import your rules?`,
        primaryAction: {
          title: "Import Rules",
          style: Alert.ActionStyle.Default,
        },
        dismissAction: {
          title: "Start Fresh",
          style: Alert.ActionStyle.Cancel,
        },
      });

      if (shouldImport) {
        await importFromConfig();
      } else {
        await setImportDismissed(true);
      }
    } catch {
      // Config file doesn't exist, no import needed
    }
  }

  async function importFromConfig() {
    if (!configPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Set configPath in extension settings",
      });
      return;
    }

    try {
      const expandedPath = expandTilde(configPath);
      const parsed = await parseFinickyConfig(expandedPath);

      if (parsed.rules.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No rules found",
          message: "Could not parse any rules from the config file",
        });
        return;
      }
      if (parsed.defaultBrowser) {
        await setDefaultBrowser(parsed.defaultBrowser);
      }

      const shouldMerge = rules.length > 0;
      let message = `Import ${parsed.rules.length} rule(s)?`;

      if (shouldMerge) {
        const mergeConfirm = await confirmAlert({
          title: "Merge Imported Rules?",
          message: `Found ${parsed.rules.length} rules in config. You have ${rules.length} existing rules.`,
          primaryAction: {
            title: "Merge (Keep Both)",
            style: Alert.ActionStyle.Default,
          },
          dismissAction: {
            title: "Cancel",
            style: Alert.ActionStyle.Cancel,
          },
        });

        if (mergeConfirm) {
          const mergedRules = [...rules, ...parsed.rules];
          await persistAndSync(mergedRules, parsed.defaultBrowser);
          message = `Merged ${parsed.rules.length} rules`;
        } else {
          const replaceConfirm = await confirmAlert({
            title: "Replace Existing Rules?",
            message: `This will delete ${rules.length} existing rule(s).`,
            primaryAction: {
              title: "Replace",
              style: Alert.ActionStyle.Destructive,
            },
            dismissAction: {
              title: "Cancel",
              style: Alert.ActionStyle.Cancel,
            },
          });
          if (!replaceConfirm) return;

          await persistAndSync(parsed.rules, parsed.defaultBrowser);
          message = `Imported ${parsed.rules.length} rules`;
        }
      } else {
        await persistAndSync(parsed.rules, parsed.defaultBrowser);
        message = `Imported ${parsed.rules.length} rules`;
      }

      await setImportDismissed(false);

      await showToast({
        style: Toast.Style.Success,
        title: message,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Import failed",
        message: String(error),
      });
    }
  }

  useEffect(() => {
    refresh().then(() => checkAndOfferImport());
  }, []);

  async function persistAndSync(nextRules: Rule[], defaultBrowserOverride?: string) {
    if (!configPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Set configPath in extension settings",
        message: "Example: ~/.finicky.js",
      });
      await saveRules(nextRules);
      setRules(nextRules);
      return;
    }

    await saveRules(nextRules);
    setRules(nextRules);

    try {
      const defaultBrowser = defaultBrowserOverride ?? (await getDefaultBrowser());
      await syncConfigFile({ configPath, defaultBrowser, rules: nextRules });
      await showToast({ style: Toast.Style.Success, title: "Finicky config updated" });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to write config file",
        message: String(e),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search rules…"
      actions={
        <ActionPanel>
          <Action
            title="Create New Rule"
            icon={Icon.Plus}
            onAction={() => {
              push(
                <RuleForm
                  title="Create Rule"
                  onSubmit={async (rule) => {
                    await persistAndSync([...rules, rule]);
                  }}
                />,
              );
            }}
          />
          <Action
            title="Import from Config File"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onAction={importFromConfig}
          />
        </ActionPanel>
      }
    >
      {sortedRules.map((rule) => (
        <List.Item
          key={rule.id}
          title={rule.name}
          subtitle={`${rule.enabled ? "Enabled" : "Disabled"} • ${rule.matchType} • ${rule.patterns.length} pattern(s) • ${rule.browser}`}
          icon={rule.enabled ? Icon.CheckCircle : Icon.Circle}
          accessories={[{ text: rule.browser }]}
          actions={
            <ActionPanel>
              <Action
                title="Edit Rule"
                icon={Icon.Pencil}
                onAction={() => {
                  push(
                    <RuleForm
                      title="Edit Rule"
                      initial={rule}
                      onSubmit={async (updated) => {
                        const next = rules.map((r) => (r.id === updated.id ? updated : r));
                        await persistAndSync(next);
                      }}
                    />,
                  );
                }}
              />

              <Action
                title={rule.enabled ? "Disable Rule" : "Enable Rule"}
                icon={rule.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                onAction={async () => {
                  const next = rules.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
                  await persistAndSync(next);
                }}
              />

              <Action
                title="Create New Rule"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => {
                  push(
                    <RuleForm
                      title="Create Rule"
                      onSubmit={async (rule) => {
                        await persistAndSync([...rules, rule]);
                      }}
                    />,
                  );
                }}
              />

              <Action
                title="Delete Rule"
                style={Action.Style.Destructive}
                icon={Icon.Trash}
                onAction={async () => {
                  const ok = await confirmAlert({
                    title: "Delete rule?",
                    message: rule.name,
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                    },
                  });
                  if (!ok) return;

                  const next = rules.filter((r) => r.id !== rule.id);
                  await persistAndSync(next);
                }}
              />

              <Action
                title="Import from Config File"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
                onAction={importFromConfig}
              />

              <Action
                title="Open Config File"
                icon={Icon.Document}
                onAction={async () => {
                  if (!configPath) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Set configPath in extension settings",
                    });
                    return;
                  }
                  await open(expandTilde(configPath));
                }}
              />

              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={async () => {
                  await refresh();
                  await showToast({ style: Toast.Style.Success, title: "Reloaded" });
                }}
              />

              <Action title="Pop to Root" icon={Icon.ChevronUp} onAction={async () => popToRoot()} />
            </ActionPanel>
          }
        />
      ))}

      <List.EmptyView
        title="No rules yet"
        description="Create a rule to start generating your Finicky config."
        actions={
          <ActionPanel>
            <Action
              title="Create New Rule"
              icon={Icon.Plus}
              onAction={() => {
                push(
                  <RuleForm
                    title="Create Rule"
                    onSubmit={async (rule) => {
                      await persistAndSync([...rules, rule]);
                    }}
                  />,
                );
              }}
            />
            <Action
              title="Import from Config File"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onAction={importFromConfig}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
