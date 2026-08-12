import { Action, ActionPanel, Color, Grid, Icon, Toast, showToast, Clipboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useRef, useState } from "react";

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

async function fetchTsxSource(name: string): Promise<string> {
  const response = await fetch(`${REGISTRY_BASE}/${name}.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch source for ${name}: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as RegistryItem;
  return data?.files?.[0]?.content ?? "";
}

function IconActions({ name, packageManager }: { name: string; packageManager: PackageManager }) {
  const cacheRef = useRef<string | null>(null);

  const copyTsx = async () => {
    try {
      if (cacheRef.current === null) {
        await showToast({ style: Toast.Style.Animated, title: "Fetching source..." });
        cacheRef.current = await fetchTsxSource(name);
      }
      await Clipboard.copy(cacheRef.current);
      await showToast({ style: Toast.Style.Success, title: "TSX Copied!" });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to fetch source" });
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Copy TSX Code" icon={Icon.Clipboard} onAction={copyTsx} />
        <Action
          title={`Copy ${packageManager} Install Command`}
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          onAction={async () => {
            await Clipboard.copy(INSTALL_COMMANDS[packageManager](name));
            await showToast({ style: Toast.Style.Success, title: `${packageManager} command copied!` });
          }}
        />
        <Action.OpenInBrowser
          title="Open in V0"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          url={`https://v0.dev/chat?q=use+the+${name}+icon+from+lucide-animated`}
        />
        <Action.OpenInBrowser
          title="Open on Lucide Animated"
          icon={Icon.Globe}
          url={`https://lucide-animated.com/icons/${name}`}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [packageManager, setPackageManager] = useState<PackageManager>("pnpm");

  const {
    data: registry,
    isLoading: registryLoading,
    error,
  } = useFetch<Registry>(REGISTRY_URL, {
    parseResponse: async (response) => response.json() as Promise<Registry>,
  });

  const allIcons: string[] = [...new Set(registry?.items?.map((item) => item.name) ?? [])].sort();

  const filteredIcons = searchText ? allIcons.filter((name) => name.includes(searchText.toLowerCase())) : allIcons;

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Large}
      searchBarPlaceholder="Search icons..."
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
      {error && (
        <Grid.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load icons"
          description="Unable to fetch the icon registry. Please check your internet connection and try again."
        />
      )}
      {!error && !registryLoading && filteredIcons.length === 0 && (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No icons found"
          description={
            searchText ? `No icons match "${searchText}". Try a different search term.` : "No icons available."
          }
        />
      )}
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
