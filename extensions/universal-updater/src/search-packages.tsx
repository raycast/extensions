import {
  Action,
  ActionPanel,
  List,
  Icon,
  Toast,
  showToast,
  getPreferenceValues,
  popToRoot,
} from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import {
  EcosystemId,
  installPackage,
  isEcosystemAvailable,
} from "./ecosystems";

const ECOSYSTEM_NAMES: Record<EcosystemId, string> = {
  brew: "Homebrew",
  npm: "npm",
  yarn: "yarn",
  pnpm: "pnpm",
  pip: "pip",
  pipx: "pipx",
  cargo: "cargo",
  gem: "RubyGems",
  mas: "Mac App Store",
  go: "Go",
  bun: "bun",
  deno: "deno",
  composer: "composer",
};

type SearchResult = {
  name: string;
  description?: string;
  version?: string;
};

export default function Command() {
  const prefs = getPreferenceValues() as Record<string, any>;
  const enabledEcosystems = useMemo(
    () =>
      (Object.keys(ECOSYSTEM_NAMES) as EcosystemId[]).filter(
        (id) => prefs[`enable${id.charAt(0).toUpperCase() + id.slice(1)}`],
      ),
    [],
  );

  const [ecosystem, setEcosystem] = useState<EcosystemId>(
    enabledEcosystems[0] || "npm",
  );
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function performSearch() {
      if (!searchText.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        let items: SearchResult[] = [];

        // Live search only implemented for some, otherwise fallback to exact input
        if (
          ecosystem === "npm" ||
          ecosystem === "yarn" ||
          ecosystem === "pnpm" ||
          ecosystem === "bun"
        ) {
          const res = await fetch(
            `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(searchText)}&size=20`,
          );
          const json = (await res.json()) as any;
          items = json.objects.map((obj: any) => ({
            name: obj.package.name,
            description: obj.package.description,
            version: obj.package.version,
          }));
        } else if (ecosystem === "composer") {
          const res = await fetch(
            `https://packagist.org/search.json?q=${encodeURIComponent(searchText)}&per_page=15`,
          );
          const json = (await res.json()) as any;
          items = json.results.map((r: any) => ({
            name: r.name,
            description: r.description,
          }));
        } else {
          // Fallback for others, just show the exact text as an option
          items = [
            {
              name: searchText.trim(),
              description: `Install ${searchText} via ${ECOSYSTEM_NAMES[ecosystem]}`,
            },
          ];
        }

        if (active) {
          setResults(items);
        }
      } catch (e) {
        if (active) {
          setResults([
            {
              name: searchText.trim(),
              description:
                "Search failed, but you can still try installing this exact name.",
            },
          ]);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    const timer = setTimeout(() => {
      void performSearch();
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchText, ecosystem]);

  async function handleInstall(pkgName: string) {
    if (!pkgName) return;

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing ${pkgName}...`,
    });

    try {
      const available = await isEcosystemAvailable(ecosystem);
      if (!available) {
        throw new Error(
          `${ECOSYSTEM_NAMES[ecosystem]} is not available on this system.`,
        );
      }

      await installPackage(ecosystem, pkgName);
      toast.style = Toast.Style.Success;
      toast.title = `Installed ${pkgName}`;
      setTimeout(() => popToRoot(), 1500);
    } catch (err: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Installation failed";
      toast.message = err?.message ?? String(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (enabledEcosystems.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No ecosystems enabled"
          description="Please enable at least one in the extension preferences."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${ECOSYSTEM_NAMES[ecosystem]} packages...`}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Package Manager"
          value={ecosystem}
          onChange={(v) => {
            setEcosystem(v as EcosystemId);
            setSearchText("");
            setResults([]);
          }}
        >
          {enabledEcosystems.map((id) => (
            <List.Dropdown.Item
              key={id}
              value={id}
              title={ECOSYSTEM_NAMES[id]}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Results">
        {results.map((pkg) => (
          <List.Item
            key={pkg.name}
            title={pkg.name}
            subtitle={pkg.description}
            accessories={pkg.version ? [{ text: pkg.version }] : []}
            icon={Icon.Box}
            actions={
              <ActionPanel>
                <Action
                  title="Install Package"
                  icon={Icon.Download}
                  onAction={() => void handleInstall(pkg.name)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {results.length === 0 && searchText.trim() === "" && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={`Search ${ECOSYSTEM_NAMES[ecosystem]}`}
          description="Type to search for packages to install."
        />
      )}
    </List>
  );
}
