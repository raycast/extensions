import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { searchPackages, installPackage } from "./utils";
import { WingetPackage } from "./types";

export default function Command() {
  const [packages, setPackages] = useState<WingetPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (searchText.trim().length === 0) {
      setPackages([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await searchPackages(searchText);
        setPackages(result.packages);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchText]);

  const handleInstall = async (pkg: WingetPackage) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing ${pkg.name}...`,
      message: "This may take a few minutes",
    });

    try {
      const result = await installPackage(pkg.id);

      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = `Successfully installed ${pkg.name}`;
        toast.message = undefined;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to install ${pkg.name}`;
        toast.message = result.error;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to install ${pkg.name}`;
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    }
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search packages to install..."
      throttle
    >
      {packages.length === 0 && searchText.trim().length > 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Download}
          title="No packages found"
          description="Try searching for a different package name"
        />
      ) : searchText.trim().length === 0 ? (
        <List.EmptyView
          icon={Icon.Download}
          title="Install Packages with WinGet"
          description="Start typing to search for packages to install"
        />
      ) : (
        packages.map((pkg) => (
          <List.Item
            key={pkg.id}
            title={pkg.name}
            subtitle={pkg.id}
            accessories={[{ text: pkg.version }, { text: pkg.source, icon: Icon.Globe }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title={`Install ${pkg.name}`} icon={Icon.Download} onAction={() => handleInstall(pkg)} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy Package ID" content={pkg.id} />
                  <Action.CopyToClipboard title="Copy Install Command" content={`winget install "${pkg.id}"`} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
