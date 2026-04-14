import { useState, useMemo } from "react";
import { ActionPanel, Action, Icon, List, Keyboard, showToast, Toast } from "@raycast/api";
import { useFetch, useLocalStorage } from "@raycast/utils";

const NPM_SEARCH_BASE = "https://registry.npmjs.org/-/v1/search";
const DT_GITHUB_TYPES_BASE = "https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types";
const NPM_BASE = "https://www.npmjs.com/package";
const NPMX_BASE = "https://npmx.dev/package";

type NpmSearchResponse = {
  objects: Array<{ package: { name: string } }>;
};

type TypePackage = {
  dirName: string;
  displayName: string;
  installName: string;
  npmUrl: string;
  npmxUrl: string;
  githubUrl: string;
};

function resolvePackageNames(dirName: string): Pick<TypePackage, "displayName" | "installName"> {
  const installName = `@types/${dirName}`;
  if (dirName.includes("__")) {
    const [scope, pkg] = dirName.split("__");
    return { displayName: `@${scope}/${pkg}`, installName };
  }
  return { displayName: dirName, installName };
}

function toTypePackage(npmName: string): TypePackage {
  const dirName = npmName.startsWith("@types/") ? npmName.replace("@types/", "") : npmName;
  const { displayName, installName } = resolvePackageNames(dirName);
  return {
    dirName,
    displayName,
    installName,
    npmUrl: `${NPM_BASE}/${installName}`,
    npmxUrl: `${NPMX_BASE}/${installName}`,
    githubUrl: `${DT_GITHUB_TYPES_BASE}/${dirName}`,
  };
}

function PackageActions({
  pkg,
  isFavorite,
  onToggleFavorite,
}: {
  pkg: TypePackage;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard
        title="Copy Install Command"
        content={`npm install -D ${pkg.installName}`}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action
        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        icon={isFavorite ? Icon.StarDisabled : Icon.Star}
        onAction={onToggleFavorite}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "f" },
          Windows: { modifiers: ["ctrl", "shift"], key: "f" },
        }}
      />
      <Action.OpenInBrowser
        title="Open on Npmx.dev"
        url={pkg.npmxUrl}
        shortcut={{ macOS: { modifiers: ["cmd"], key: "x" }, Windows: { modifiers: ["ctrl"], key: "x" } }}
      />
      <Action.OpenInBrowser
        title="Open on Npmjs.com"
        url={pkg.npmUrl}
        shortcut={{ macOS: { modifiers: ["cmd"], key: "n" }, Windows: { modifiers: ["ctrl"], key: "n" } }}
      />
      <Action.OpenInBrowser
        title="Open on GitHub"
        url={pkg.githubUrl}
        shortcut={{ macOS: { modifiers: ["cmd"], key: "g" }, Windows: { modifiers: ["ctrl"], key: "g" } }}
      />
    </ActionPanel>
  );
}

function EmptyView({
  error,
  isLoading,
  packages,
  searchText,
}: {
  error?: Error;
  isLoading: boolean;
  packages: TypePackage[];
  searchText: string;
}) {
  if (error) {
    return <List.EmptyView icon={Icon.ExclamationMark} title="Search failed" description={error.message} />;
  }
  if (!isLoading && packages.length === 0) {
    return (
      <List.EmptyView icon={Icon.XMarkCircle} title="No packages found" description={`No match for "${searchText}"`} />
    );
  }
  return null;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const shouldSearch = searchText.length >= 2;

  const { value: favorites = [], setValue: setFavorites } = useLocalStorage<string[]>("dt-favorites", []);

  async function toggleFavorite(dirName: string) {
    const isFav = favorites.includes(dirName);
    const newFavorites = isFav ? favorites.filter((f) => f !== dirName) : [...favorites, dirName];

    try {
      await setFavorites(newFavorites);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to update favorites" });
    }
  }

  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
  const favoritePackages = useMemo(() => favorites.map(toTypePackage), [favorites]);

  const { isLoading, data, error } = useFetch<NpmSearchResponse>(
    `${NPM_SEARCH_BASE}?text=%40types%2F${encodeURIComponent(searchText)}&size=20`,
    {
      execute: shouldSearch,
      keepPreviousData: false,
    },
  );

  const packages = useMemo(() => {
    if (!data?.objects) return [];
    const seen = new Set<string>();

    return data.objects
      .map(({ package: pkg }) => toTypePackage(pkg.name))
      .filter((pkg) => {
        if (seen.has(pkg.dirName)) return false;
        seen.add(pkg.dirName);
        return true;
      });
  }, [data]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search TypeScript type packages..."
      searchText={searchText}
    >
      {!shouldSearch ? (
        favoritePackages.length > 0 ? (
          <List.Section title="Favorites">
            {favoritePackages.map((pkg) => (
              <List.Item
                key={pkg.dirName}
                icon={Icon.StarCircle}
                title={pkg.displayName}
                subtitle={pkg.installName}
                actions={
                  <PackageActions pkg={pkg} isFavorite={true} onToggleFavorite={() => toggleFavorite(pkg.dirName)} />
                }
              />
            ))}
          </List.Section>
        ) : (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="Search @types packages"
            description="Type at least 2 characters to search • press ⌘⇧F (macOS) or Ctrl+Shift+f (Windows) on any result to favorite"
          />
        )
      ) : (
        <>
          <EmptyView error={error} isLoading={isLoading} packages={packages} searchText={searchText} />
          {packages.map((pkg) => {
            const isFavorite = favoritesSet.has(pkg.dirName);
            return (
              <List.Item
                key={pkg.dirName}
                icon={Icon.Code}
                title={pkg.displayName}
                subtitle={pkg.installName}
                accessories={[
                  {
                    icon: isFavorite ? Icon.StarCircle : Icon.Star,
                    tooltip: "⌘⇧F (macOS) or Ctrl+Shift+f (Windows) to favorite",
                  },
                ]}
                actions={
                  <PackageActions
                    pkg={pkg}
                    isFavorite={isFavorite}
                    onToggleFavorite={() => toggleFavorite(pkg.dirName)}
                  />
                }
              />
            );
          })}
        </>
      )}
    </List>
  );
}
