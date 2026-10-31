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
import { syncConfigFile, UnimportedRulesError } from "./utils/finicky";
import { parseFinickyConfig } from "./utils/parser";
import { getInstalledBrowsers, isBrowserInstalled, Browser } from "./utils/browsers";
import { browserUsage, reassignBrowser, sameBrowser } from "./utils/reassign";
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

function useInstalledBrowsers() {
  const [installedBrowsers, setInstalledBrowsers] = useState<Browser[]>([]);
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

  return { installedBrowsers, isLoadingBrowsers };
}

/**
 * Dropdown items for detected browsers, plus any browser names that are already
 * in use but not detected. Without those, Raycast would silently select the
 * first item and saving would change the rule's browser.
 */
function BrowserDropdownItems(props: { installedBrowsers: Browser[]; keep: string[] }) {
  const missing = props.keep
    .map((b) => b.trim())
    .filter(Boolean)
    .filter((b, i, all) => all.findIndex((other) => sameBrowser(other, b)) === i)
    .filter((b) => !isBrowserInstalled(b, props.installedBrowsers));

  return (
    <>
      {props.installedBrowsers.map((browser) => (
        <Form.Dropdown.Item
          key={browser.bundleId}
          value={browser.name}
          title={browser.name}
          icon={browser.appPath ? { fileIcon: browser.appPath } : Icon.AppWindow}
        />
      ))}
      {missing.map((browser) => (
        <Form.Dropdown.Item
          key={`missing-${browser}`}
          value={browser}
          title={`${browser} (not installed)`}
          icon={Icon.Warning}
        />
      ))}
    </>
  );
}

/**
 * Resolves a stored browser value to the matching dropdown item value, so a rule
 * saved as "google chrome" or "com.google.Chrome" still selects "Google Chrome".
 */
function dropdownValueFor(browser: string, installedBrowsers: Browser[]): string {
  const needle = browser.trim().toLowerCase();
  const match = installedBrowsers.find((b) => b.name.toLowerCase() === needle || b.bundleId.toLowerCase() === needle);
  return match?.name ?? browser.trim();
}

function ReassignBrowserForm(props: {
  rules: Rule[];
  initialFrom?: string;
  onSubmit: (args: { from: string; to: string; includeDisabled: boolean; updateDefault: boolean }) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const { installedBrowsers, isLoadingBrowsers } = useInstalledBrowsers();
  const usage = useMemo(() => browserUsage(props.rules), [props.rules]);

  const [from, setFrom] = useState(props.initialFrom?.trim() ?? usage[0]?.browser ?? "");
  const [to, setTo] = useState("");
  const [toInputMode, setToInputMode] = useState<"dropdown" | "manual">("dropdown");
  const [includeDisabled, setIncludeDisabled] = useState(true);
  const [defaultBrowser, setDefaultBrowserState] = useState("");

  useEffect(() => {
    getDefaultBrowser().then(setDefaultBrowserState);
  }, []);

  // Pick a sensible target once detection finishes: the first browser that isn't the source.
  useEffect(() => {
    if (to || installedBrowsers.length === 0) return;
    const firstOther = installedBrowsers.find((b) => !sameBrowser(b.name, from));
    if (firstOther) setTo(firstOther.name);
  }, [installedBrowsers]);

  const fromUsage = usage.find((u) => sameBrowser(u.browser, from));
  const affected = fromUsage ? (includeDisabled ? fromUsage.total : fromUsage.enabled) : 0;
  const defaultIsFrom = Boolean(defaultBrowser) && sameBrowser(defaultBrowser, from);

  return (
    <Form
      navigationTitle="Reassign Browser"
      isLoading={isLoadingBrowsers}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Reassign Rules"
            icon={Icon.Switch}
            onSubmit={async (values) => {
              const target = String((toInputMode === "manual" ? values.toManual : to) ?? "").trim();
              if (!target) {
                await showToast({ style: Toast.Style.Failure, title: "Choose a browser to move rules to" });
                return;
              }
              if (sameBrowser(target, from)) {
                await showToast({ style: Toast.Style.Failure, title: "From and To are the same browser" });
                return;
              }
              const done = await props.onSubmit({
                from,
                to: target,
                includeDisabled,
                updateDefault: defaultIsFrom && Boolean(values.updateDefault),
              });
              if (done) pop();
            }}
          />
          <Action
            title={toInputMode === "dropdown" ? "Enter Target Browser Manually" : "Select from Detected Browsers"}
            icon={Icon.AppWindow}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onAction={() => setToInputMode(toInputMode === "dropdown" ? "manual" : "dropdown")}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Move every rule that opens in one browser to another browser." />

      <Form.Dropdown id="from" title="From" value={from} onChange={setFrom}>
        {usage.map((u) => (
          <Form.Dropdown.Item
            key={u.browser}
            value={u.browser}
            title={`${u.browser} (${u.total} rule${u.total === 1 ? "" : "s"})`}
          />
        ))}
      </Form.Dropdown>

      {toInputMode === "dropdown" ? (
        <Form.Dropdown id="to" title="To" value={to} onChange={setTo} isLoading={isLoadingBrowsers}>
          <BrowserDropdownItems installedBrowsers={installedBrowsers} keep={[to]} />
        </Form.Dropdown>
      ) : (
        <Form.TextField id="toManual" title="To (Browser name)" placeholder="Examples: Arc, Brave Browser, Safari" />
      )}

      <Form.Checkbox
        id="includeDisabled"
        label="Include disabled rules"
        value={includeDisabled}
        onChange={setIncludeDisabled}
      />

      {defaultIsFrom && (
        <Form.Checkbox
          id="updateDefault"
          label={`Also change the default browser (currently ${defaultBrowser})`}
          defaultValue={true}
        />
      )}

      <Form.Description title="Affected" text={`${affected} rule${affected === 1 ? "" : "s"} will be updated`} />
    </Form>
  );
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
  const { installedBrowsers, isLoadingBrowsers } = useInstalledBrowsers();
  const [browserInputMode, setBrowserInputMode] = useState<"dropdown" | "manual">("dropdown");
  // Controlled so the rule's existing browser stays selected even before (or without) detection finding it.
  const [browser, setBrowser] = useState(initial?.browser?.trim() ?? "");

  useEffect(() => {
    if (installedBrowsers.length === 0) return;
    if (browser) {
      setBrowser(dropdownValueFor(browser, installedBrowsers));
      return;
    }
    getDefaultBrowser().then((defaultBrowser) => {
      const preferred = installedBrowsers.find((b) => !sameBrowser(b.name, defaultBrowser)) ?? installedBrowsers[0];
      setBrowser((current) => current || preferred.name);
    });
  }, [installedBrowsers]);

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
                browser: String((browserInputMode === "dropdown" ? browser : values.browser) ?? "").trim(),
              };

              if (!rule.browser) {
                await showToast({ style: Toast.Style.Failure, title: "Browser is required" });
                return;
              }

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
          <Form.Dropdown
            id="browser"
            title="Open In"
            value={browser}
            onChange={setBrowser}
            isLoading={isLoadingBrowsers}
          >
            <BrowserDropdownItems installedBrowsers={installedBrowsers} keep={[browser]} />
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
            defaultValue={browser || initial?.browser || "Arc"}
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
  const { installedBrowsers, isLoadingBrowsers } = useInstalledBrowsers();

  const rulesByBrowser = useMemo(() => {
    return browserUsage(rules)
      .sort((a, b) => a.browser.localeCompare(b.browser))
      .map((u) => ({
        ...u,
        rules: rules.filter((r) => sameBrowser(r.browser, u.browser)).sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [rules]);

  async function reassign(args: { from: string; to: string; includeDisabled: boolean; updateDefault: boolean }) {
    const { rules: next, changed } = reassignBrowser(rules, args);
    if (changed.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: `No rules use ${args.from}` });
      return false;
    }

    const ok = await confirmAlert({
      title: `Move ${changed.length} rule${changed.length === 1 ? "" : "s"} to ${args.to}?`,
      message: `${changed.map((r) => r.name).join(", ")}${args.updateDefault ? `\n\nThe default browser will also change to ${args.to}.` : ""}`,
      primaryAction: { title: "Reassign", style: Alert.ActionStyle.Default },
    });
    if (!ok) return false;

    const saved = await persistAndSync(next, args.updateDefault ? args.to : undefined);
    if (saved && args.updateDefault) {
      await setDefaultBrowser(args.to);
    }
    return saved;
  }

  function pushReassign(initialFrom?: string) {
    push(<ReassignBrowserForm rules={rules} initialFrom={initialFrom} onSubmit={reassign} />);
  }

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
          if (!(await persistAndSync(mergedRules, parsed.defaultBrowser))) return;
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

          if (!(await persistAndSync(parsed.rules, parsed.defaultBrowser, { replaceExisting: true }))) return;
          message = `Imported ${parsed.rules.length} rules`;
        }
      } else {
        if (!(await persistAndSync(parsed.rules, parsed.defaultBrowser, { replaceExisting: true }))) return;
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

  /**
   * Writes the config file first and only saves `nextRules` once that succeeds,
   * so a refused or failed write leaves storage and the file in step.
   */
  async function persistAndSync(
    nextRules: Rule[],
    defaultBrowserOverride?: string,
    options?: { replaceExisting?: boolean },
  ): Promise<boolean> {
    if (!configPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Set configPath in extension settings",
        message: "Example: ~/.finicky.js",
      });
      await saveRules(nextRules);
      setRules(nextRules);
      return true;
    }

    try {
      const defaultBrowser = defaultBrowserOverride ?? (await getDefaultBrowser());
      await syncConfigFile({
        configPath,
        defaultBrowser,
        rules: nextRules,
        previousRuleCount: rules.length,
        replaceExisting: options?.replaceExisting,
      });
    } catch (e) {
      if (e instanceof UnimportedRulesError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Import your existing rules first",
          message: e.message,
          primaryAction: { title: "Import from Config File", onAction: () => importFromConfig() },
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to write config file",
          message: String(e),
        });
      }
      return false;
    }

    await saveRules(nextRules);
    setRules(nextRules);
    await showToast({ style: Toast.Style.Success, title: "Finicky config updated" });
    return true;
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
          {rules.length > 0 && (
            <Action
              title="Reassign Browser…"
              icon={Icon.Switch}
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
              onAction={() => pushReassign()}
            />
          )}
        </ActionPanel>
      }
    >
      {rulesByBrowser.map((group) => {
        const installed = isLoadingBrowsers || isBrowserInstalled(group.browser, installedBrowsers);
        return (
          <List.Section
            key={group.browser}
            title={group.browser}
            subtitle={`${group.total} rule${group.total === 1 ? "" : "s"}${installed ? "" : " • not installed"}`}
          >
            {group.rules.map((rule) => (
              <List.Item
                key={rule.id}
                title={rule.name}
                subtitle={`${rule.enabled ? "Enabled" : "Disabled"} • ${rule.matchType} • ${rule.patterns.length} pattern(s)`}
                keywords={[rule.browser, ...rule.patterns]}
                icon={rule.enabled ? Icon.CheckCircle : Icon.Circle}
                accessories={
                  installed
                    ? [{ text: rule.browser }]
                    : [
                        {
                          icon: Icon.Warning,
                          text: rule.browser,
                          tooltip: `${rule.browser} was not detected on this Mac`,
                        },
                      ]
                }
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
                      title={`Reassign All ${rule.browser} Rules…`}
                      icon={Icon.Switch}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                      onAction={() => pushReassign(rule.browser)}
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
          </List.Section>
        );
      })}

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
