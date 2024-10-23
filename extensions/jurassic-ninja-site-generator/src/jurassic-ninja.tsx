import {
  ActionPanel,
  Action,
  Color,
  List,
  showHUD,
  showToast,
  Toast,
  Icon,
  Clipboard,
  open,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect } from "react";

interface Option {
  key: string;
  title: string;
  description?: string;
  group: string;
}

const OPTIONS: Option[] = [
  // Jetpack options
  { key: "nojetpack", title: "No Jetpack", description: "Don't install Jetpack", group: "Jetpack" },
  {
    key: "jetpack-beta",
    title: "Jetpack Beta",
    description: "Install the Jetpack Beta Tester plugin",
    group: "Jetpack",
  },
  {
    key: "jetpack-backup",
    title: "Jetpack Backup",
    description: "Install the Jetpack Backup plugin",
    group: "Jetpack",
  },
  { key: "jetpack-boost", title: "Jetpack Boost", description: "Install the Jetpack Boost plugin", group: "Jetpack" },
  {
    key: "jetpack-social",
    title: "Jetpack Social",
    description: "Install the Jetpack Social plugin",
    group: "Jetpack",
  },
  {
    key: "jetpack-protect",
    title: "Jetpack Protect",
    description: "Install the Jetpack Protect plugin",
    group: "Jetpack",
  },
  {
    key: "jetpack-search",
    title: "Jetpack Search",
    description: "Install the Jetpack Search plugin",
    group: "Jetpack",
  },
  {
    key: "jetpack-videopress",
    title: "Jetpack VideoPress",
    description: "Install the Jetpack VideoPress plugin",
    group: "Jetpack",
  },
  { key: "jpcrm", title: "Jetpack CRM", description: "Install the Jetpack CRM plugin", group: "Jetpack" },
  {
    key: "jetpack-debug-helper",
    title: "Jetpack Debug Helper",
    description: "Install the Jetpack Debug Helper plugin",
    group: "Jetpack",
  },
  {
    key: "client-example",
    title: "Jetpack Client Example",
    description: "Install the Jetpack Client Example plugin",
    group: "Jetpack",
  },

  // WooCommerce options
  {
    key: "wc-smooth-generator",
    title: "WooCommerce Smooth Generator",
    description: "Install the WooCommerce Smooth Generator plugin",
    group: "WooCommerce",
  },
  { key: "woocommerce", title: "WooCommerce", description: "Install WooCommerce", group: "WooCommerce" },
  {
    key: "woocommerce-beta-tester",
    title: "WooCommerce Beta Tester",
    description: "Install the WooCommerce Beta Tester plugin",
    group: "WooCommerce",
  },

  // Plugins options
  { key: "gutenberg", title: "Gutenberg", description: "Install the Gutenberg plugin", group: "Other Plugins" },
  {
    key: "code-snippets",
    title: "Code Snippets",
    description: "Install the Code Snippets plugin",
    group: "Other Plugins",
  },
  {
    key: "config-constants",
    title: "Config Constants",
    description: "Install the Config Constants plugin",
    group: "Other Plugins",
  },
  { key: "crowdsignal", title: "Crowdsignal", description: "Install the Crowdsignal plugin", group: "Other Plugins" },
  { key: "mailpoet", title: "MailPoet", description: "Install the MailPoet plugin", group: "Other Plugins" },
  {
    key: "wp-downgrade",
    title: "WP Downgrade",
    description: "Install the WP Downgrade plugin",
    group: "Other Plugins",
  },
  {
    key: "wp-job-manager",
    title: "WP Job Manager",
    description: "Install the WP Job Manager plugin",
    group: "Other Plugins",
  },
  {
    key: "wp-log-viewer",
    title: "WP Log Viewer",
    description: "Install the WP Log Viewer plugin",
    group: "Other Plugins",
  },
  { key: "wp-rollback", title: "WP Rollback", description: "Install the WP Rollback plugin", group: "Other Plugins" },
  {
    key: "wp-super-cache",
    title: "WP Super Cache",
    description: "Install the WP Super Cache plugin",
    group: "Other Plugins",
  },
  { key: "vaultpress", title: "VaultPress", description: "Install the VaulPress plugin", group: "Other Plugins" },

  // Site options
  { key: "blockxmlrpc", title: "Block XML-RPC", description: "Block access to xmlrpc.php", group: "Site" },
  {
    key: "dev-pool",
    title: "Enable Sandbox Access",
    description: "Connect directly to your WP.com sandbox",
    group: "Site",
  },
  { key: "content", title: "Add Content", description: "Add pre-generated content to the site", group: "Site" },
  {
    key: "subdir_multisite",
    title: "Subdirectory Multisite",
    description: "Set up a multisite installation based on subdirectories",
    group: "Site",
  },
  {
    key: "subdomain_multisite",
    title: "Subdomain Multisite",
    description: "Set up a multisite installation based on subdomains",
    group: "Site",
  },
  { key: "wp-debug-log", title: "WP Debug Log", description: "Set WP_DEBUG and WP_DEBUG_LOG to true", group: "Site" },
];

export default function Command() {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [defaultOptions, setDefaultOptions] = useState<string[]>([]);

  useEffect(() => {
    loadDefaultOptions();
  }, []);

  async function loadDefaultOptions() {
    const savedDefaults = await LocalStorage.getItem<string>("defaultOptions");
    if (savedDefaults) {
      const parsedDefaults = JSON.parse(savedDefaults);
      setDefaultOptions(parsedDefaults);
      setSelectedOptions(parsedDefaults);
    }
  }

  async function saveDefaultOptions() {
    await LocalStorage.setItem("defaultOptions", JSON.stringify(selectedOptions));
    setDefaultOptions(selectedOptions);
    await showToast({
      style: Toast.Style.Success,
      title: "Default options saved",
    });
  }

  async function resetDefaultOptions() {
    await LocalStorage.removeItem("defaultOptions");
    setSelectedOptions(defaultOptions);
    await showToast({
      style: Toast.Style.Success,
      title: "Default options reset",
    });
  }

  function toggleOption(key: string) {
    setSelectedOptions((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  }

  function buildUrl() {
    const baseUrl = "https://jurassic.ninja/create?";
    const params = selectedOptions.join("&");
    return `${baseUrl}?${params}`;
  }

  async function handleCreate() {
    const url = buildUrl();

    try {
      await Clipboard.copy(url);
      await showHUD("Opening in browser...");
      open(url);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to create site or copy URL",
      });
    }
  }

  const groupedOptions = OPTIONS.reduce(
    (acc, option) => {
      if (!acc[option.group]) {
        acc[option.group] = [];
      }
      acc[option.group].push(option);
      return acc;
    },
    {} as Record<string, Option[]>,
  );

  return (
    <List searchBarPlaceholder="Filter JN options...">
      <List.EmptyView title="Launch JN Test Site" description="No options found for that search term" />

      <List.Item
        title="Launch JN Test Site"
        icon={{ source: Icon.Globe, tintColor: Color.SecondaryText }}
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Globe}
              title="Launch Site"
              onAction={handleCreate}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
            <Action.CopyToClipboard title="Copy URL" content={buildUrl()} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          </ActionPanel>
        }
      />

      {Object.entries(groupedOptions).map(([group, options]) => (
        <List.Section key={group} title={group}>
          {options.map((option) => (
            <List.Item
              key={option.key}
              title={option.title}
              subtitle={option.description}
              icon={
                selectedOptions.includes(option.key)
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Toggle Option"
                    onAction={() => toggleOption(option.key)}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      <List.Section key="meta" title="Extension options">
        <List.Item
          title="Save Current Options as Default"
          icon={{ source: Icon.Star }}
          actions={
            <ActionPanel>
              <Action
                title="Save as Default"
                onAction={saveDefaultOptions}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Reset Default Options"
          icon={{ source: Icon.ArrowCounterClockwise }}
          actions={
            <ActionPanel>
              <Action
                title="Reset Default Options"
                onAction={resetDefaultOptions}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
