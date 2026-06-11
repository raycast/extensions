import {
  Action,
  ActionPanel,
  BrowserExtension,
  environment,
  Form,
  getApplications,
  getFrontmostApplication,
  Icon,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { createDefaultPolicy, DEFAULT_MODE, type Mode } from "./lib/constants";
import {
  ensureConfigFileExists,
  getConfigFilePath,
  loadPolicy,
  normalizeApp,
  normalizeWebsite,
  type Policy,
  savePolicy,
} from "./lib/policy";

type FormValues = {
  mode: Mode;
  apps: string[];
  websites: string[];
};

export default function ConfigureCommand() {
  const [policy, setPolicy] = useState<Policy>(createDefaultPolicy);
  const [applications, setApplications] = useState<{ name: string; bundleId: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const canAccessBrowserExtension = environment.canAccess(BrowserExtension);

  const { handleSubmit, setValue, values } = useForm<FormValues>({
    initialValues: {
      mode: DEFAULT_MODE,
      apps: [],
      websites: [],
    },
    onSubmit: async (formValues) => {
      try {
        const normalizedApps = formValues.apps.map(normalizeApp).filter(Boolean);
        const normalizedWebsites = formValues.websites.map(normalizeWebsite).filter(Boolean);
        const previousPolicy = policy;
        const nextList = { apps: normalizedApps, websites: normalizedWebsites };
        const newPolicy: Policy =
          formValues.mode === "allow"
            ? {
                mode: formValues.mode,
                allow: nextList,
                block: previousPolicy.block,
              }
            : {
                mode: formValues.mode,
                allow: previousPolicy.allow,
                block: nextList,
              };

        await savePolicy(newPolicy);

        setPolicy(newPolicy);
        setValue("apps", normalizedApps);
        setValue("websites", normalizedWebsites);

        showToast({
          style: Toast.Style.Success,
          title: "Configuration saved",
          message: `Mode: ${newPolicy.mode}, Apps: ${normalizedApps.length}, Websites: ${normalizedWebsites.length}`,
        });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to save configuration",
          message: String(error),
        });
      }
    },
  });

  // Load existing policy and applications on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [loadedPolicy, apps] = await Promise.all([loadPolicy(), getApplications()]);
        setPolicy(loadedPolicy);

        // Load apps/websites from the active mode
        const activeList = loadedPolicy.mode === "allow" ? loadedPolicy.allow : loadedPolicy.block;
        setValue("mode", loadedPolicy.mode);
        setValue("apps", activeList.apps);
        setValue("websites", activeList.websites);

        setApplications(
          apps.flatMap((app) =>
            app.bundleId
              ? [
                  {
                    name: app.name,
                    bundleId: normalizeApp(app.bundleId),
                  },
                ]
              : [],
          ),
        );
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load configuration",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [setValue]);

  async function handleAddCurrentApp() {
    try {
      const frontmostApp = await getFrontmostApplication();
      if (!frontmostApp?.bundleId) {
        showToast({
          style: Toast.Style.Failure,
          title: "No active app found",
        });
        return;
      }

      const normalizedBundleId = normalizeApp(frontmostApp.bundleId);
      const currentApps = values.apps ?? [];
      if (!currentApps.includes(normalizedBundleId)) {
        const nextApps = [...currentApps, normalizedBundleId];
        setValue("apps", nextApps);
      }

      showToast({
        style: Toast.Style.Success,
        title: "Added current app",
        message: frontmostApp.name || frontmostApp.bundleId,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add current app",
        message: String(error),
      });
    }
  }

  async function handleAddCurrentWebsite() {
    if (!canAccessBrowserExtension) {
      showToast({
        style: Toast.Style.Failure,
        title: "Browser extension not accessible",
        message: "Enable Browser Extension permission in Raycast preferences",
      });
      return;
    }

    try {
      const tabs = await BrowserExtension.getTabs();
      const activeTab = tabs.find((tab) => tab.active);

      if (!activeTab?.url) {
        showToast({
          style: Toast.Style.Failure,
          title: "No active tab found",
        });
        return;
      }

      const hostname = normalizeWebsite(activeTab.url);
      if (!hostname) {
        showToast({
          style: Toast.Style.Failure,
          title: "Could not extract hostname",
          message: activeTab.url,
        });
        return;
      }

      const currentWebsites = values.websites ?? [];
      if (!currentWebsites.includes(hostname)) {
        const nextWebsites = [...currentWebsites, hostname];
        setValue("websites", nextWebsites);
      }

      showToast({
        style: Toast.Style.Success,
        title: "Added current website",
        message: hostname,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add current website",
        message: String(error),
      });
    }
  }

  if (isLoading) {
    return <Form isLoading />;
  }

  const mode = values.mode ?? DEFAULT_MODE;
  const selectedApps = values.apps ?? [];
  const selectedWebsites = values.websites ?? [];
  const modeLabel = mode === "block" ? "Block" : "Allow";

  // Combine applications from system and saved apps that might not be in system list
  const allApplications = [...applications];
  const existingBundleIds = new Set(applications.map((a) => a.bundleId));

  // Add any saved apps that aren't in the system applications list
  selectedApps.forEach((savedApp) => {
    if (!existingBundleIds.has(savedApp)) {
      allApplications.push({ name: savedApp, bundleId: savedApp });
    }
  });
  const allWebsites = Array.from(new Set([...policy.allow.websites, ...policy.block.websites, ...selectedWebsites]));

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Configuration" onSubmit={handleSubmit} />
          {canAccessBrowserExtension && (
            <Action
              title="Add Current Website"
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
              onAction={handleAddCurrentWebsite}
            />
          )}
          <Action
            title="Add Current App"
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={handleAddCurrentApp}
          />
          <Action
            title="Open Config File"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={async () => {
              try {
                const configPath = await ensureConfigFileExists();
                await open(configPath);
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to open config file",
                  message: String(error),
                });
              }
            }}
          />
          <Action.ShowInFinder
            title="Open Config Folder"
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            path={getConfigFilePath()}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure paste confirmation behavior for apps and websites." />

      <Form.Dropdown
        id="mode"
        title="Mode"
        value={mode}
        info="'Allow' means only selected apps and websites are allowed, everything else is blocked. 'Block' means only selected apps and websites are blocked, everything else is allowed."
        onChange={(newMode) => {
          const nextMode = newMode as Mode;
          const nextValues = nextMode === "allow" ? policy.allow : policy.block;
          setValue("mode", nextMode);
          setValue("apps", nextValues.apps);
          setValue("websites", nextValues.websites);
        }}
      >
        <Form.Dropdown.Item value="block" title="Block" icon={Icon.Lock} />
        <Form.Dropdown.Item value="allow" title="Allow" icon={Icon.Checkmark} />
      </Form.Dropdown>

      <Form.Separator />

      <Form.TagPicker
        id="apps"
        title={`${modeLabel}ed Apps`}
        placeholder="Select applications..."
        value={selectedApps}
        onChange={(apps) => {
          setValue("apps", apps);
        }}
      >
        {allApplications.map((app) => (
          <Form.TagPicker.Item key={app.bundleId} value={app.bundleId} title={app.name} />
        ))}
      </Form.TagPicker>

      <Form.TagPicker
        id="websites"
        title={`${modeLabel}ed Websites`}
        placeholder="Select websites..."
        value={selectedWebsites}
        info="To add a website, use 'Add Current Website' action from Actions (`⌘` + `K` on macOS). Raycast Browser Extension is required."
        onChange={(websites) => {
          setValue("websites", websites);
        }}
      >
        {allWebsites.map((website) => (
          <Form.TagPicker.Item key={website} value={website} title={website} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
