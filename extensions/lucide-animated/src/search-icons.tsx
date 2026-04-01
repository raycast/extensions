import { Action, ActionPanel, Color, Grid, Icon, Toast, showToast, Clipboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface Registry {
  items: Array<{ name: string }>;
}

interface RegistryFile {
  path: string;
  content: string;
  type: string;
}

interface RegistryItem {
  name: string;
  type: string;
  dependencies: string[];
  files: RegistryFile[];
}

const REGISTRY_URL = "https://raw.githubusercontent.com/pqoqubbw/icons/main/registry.json";
const REGISTRY_BASE = "https://lucide-animated.com/r";

const MISSING_ICONS = new Set([
  "airplane",
  "align-center",
  "align-horizontal",
  "align-vertical",
  "attach-file",
  "cart",
  "chrome",
  "circle-help",
  "clap",
  "connect",
  "cursor-click",
  "discord",
  "downvote",
  "dribbble",
  "facebook",
  "figma",
  "file-check-2",
  "fingerprint",
  "flask",
  "github",
  "home",
  "instagram",
  "key-circle",
  "linkedin",
  "logout",
  "twitch",
  "twitter",
  "upvote",
  "youtube",
  "gitlab",
  "align-left",
  "align-right",
]);

function getIconSource(name: string): string {
  if (MISSING_ICONS.has(name)) {
    return `missing-icons/${name}.svg`;
  }
  return `https://lucide.dev/api/icons/${name}`;
}

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

const INSTALL_COMMANDS: Record<PackageManager, (name: string) => string> = {
  pnpm: (name) => `pnpm dlx shadcn@latest add https://lucide-animated.com/r/${name}`,
  npm: (name) => `npx shadcn@latest add https://lucide-animated.com/r/${name}`,
  yarn: (name) => `yarn dlx shadcn@latest add https://lucide-animated.com/r/${name}`,
  bun: (name) => `bunx --bun shadcn@latest add https://lucide-animated.com/r/${name}`,
};

function IconActions({ name, packageManager }: { name: string; packageManager: PackageManager }) {
  const { data } = useFetch<RegistryItem>(`${REGISTRY_BASE}/${name}.json`, {
    parseResponse: async (response) => response.json() as Promise<RegistryItem>,
  });
  const tsxSource = data?.files?.[0]?.content ?? "";

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title="Copy TSX Code"
          icon={Icon.Clipboard}
          onAction={async () => {
            if (!tsxSource) {
              await showToast({ style: Toast.Style.Failure, title: "Source not loaded yet" });
              return;
            }
            await Clipboard.copy(tsxSource);
            await showToast({ style: Toast.Style.Success, title: "TSX copied!" });
          }}
        />
        <Action
          title={`Copy ${packageManager} Install Command`}
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={async () => {
            await Clipboard.copy(INSTALL_COMMANDS[packageManager](name));
            await showToast({ style: Toast.Style.Success, title: `${packageManager} command copied!` });
          }}
        />
        <Action.OpenInBrowser
          title="Open in V0"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "v" }}
          url={`https://v0.dev/chat?q=use+the+${name}+icon+from+lucide-animated`}
        />
        <Action.OpenInBrowser
          title="Open on Lucide Animated"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          url="https://lucide-animated.com"
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [packageManager, setPackageManager] = useState<PackageManager>("pnpm");

  const { data: registry, isLoading: registryLoading } = useFetch<Registry>(REGISTRY_URL, {
    parseResponse: async (response) => response.json() as Promise<Registry>,
  });

  const allIcons: string[] = [...new Set(registry?.items?.map((item) => item.name) ?? [])].sort();

  const filteredIcons = searchText ? allIcons.filter((name) => name.includes(searchText.toLowerCase())) : allIcons;

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Large}
      searchBarPlaceholder="search icons..."
      onSearchTextChange={setSearchText}
      isLoading={registryLoading}
      filtering={false}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Package Manager"
          storeValue
          defaultValue="pnpm"
          onChange={(val) => setPackageManager(val as PackageManager)}
        >
          <Grid.Dropdown.Item title="pnpm" value="pnpm" />
          <Grid.Dropdown.Item title="npm" value="npm" />
          <Grid.Dropdown.Item title="yarn" value="yarn" />
          <Grid.Dropdown.Item title="bun" value="bun" />
        </Grid.Dropdown>
      }
    >
      {filteredIcons.map((name) => (
        <Grid.Item
          key={name}
          title={name}
          content={{ source: getIconSource(name), tintColor: Color.PrimaryText }}
          keywords={[name]}
          actions={<IconActions name={name} packageManager={packageManager} />}
        />
      ))}
    </Grid>
  );
}
