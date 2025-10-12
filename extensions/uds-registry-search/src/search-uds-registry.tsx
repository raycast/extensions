import { Action, ActionPanel, List, showToast, Toast, Icon, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchCatalog } from "./api";
import { PackageWithOrg, Preferences } from "./types";
import { PackageDetail } from "./package-detail";
import { getAccessoriesFromFlavors } from "./utils";

export default function Command() {
  const [packages, setPackages] = useState<PackageWithOrg[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchCatalog();
      const preferences = getPreferenceValues<Preferences>();

      // Convert catalog response to array of packages with org info
      const packageArray: PackageWithOrg[] = [];
      Object.entries(response.catalog).forEach(([orgName, orgData]) => {
        // Skip organizations based on preferences
        if (preferences.ignorePublic && orgName === "public") {
          return;
        }
        if (preferences.ignoreAirgapStore && orgName === "airgap-store") {
          return;
        }

        orgData.repos.forEach((pkg) => {
          packageArray.push({
            ...pkg,
            orgName,
          });
        });
      });

      setPackages(packageArray);
      await showToast({
        style: Toast.Style.Success,
        title: "Catalog loaded",
        message: `Found ${packageArray.length} packages`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load catalog",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const filteredPackages = packages.filter((pkg) => {
    const searchLower = searchText.toLowerCase();
    return (
      pkg.repo?.toLowerCase().includes(searchLower) ||
      pkg.title?.toLowerCase().includes(searchLower) ||
      pkg.orgName?.toLowerCase().includes(searchLower) ||
      pkg.description?.toLowerCase().includes(searchLower) ||
      pkg.tagline?.toLowerCase().includes(searchLower)
    );
  });

  // Show error state with retry action
  if (error && !isLoading && packages.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Catalog"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={loadCatalog} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search UDS Registry packages..."
      throttle
    >
      {filteredPackages.map((pkg) => (
        <List.Item
          key={`${pkg.orgName}/${pkg.repo}`}
          title={`${pkg.orgName} / ${pkg.repo}`}
          subtitle={pkg.tagline || pkg.title}
          accessories={getAccessoriesFromFlavors(pkg.flavors || [])}
          icon={pkg.icon || Icon.Box}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                icon={Icon.Eye}
                target={<PackageDetail org={pkg.orgName} packageName={pkg.repo} packageData={pkg} />}
              />
              {pkg.url && (
                <Action.OpenInBrowser
                  title="Open Repository"
                  url={pkg.url}
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Package Reference"
                content={`${pkg.orgName}/${pkg.repo}`}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Package Name"
                content={pkg.repo}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              {pkg.latest_tag && (
                <Action.CopyToClipboard
                  title="Copy Latest Version"
                  content={pkg.latest_tag}
                  icon={Icon.Tag}
                  shortcut={{ modifiers: ["cmd"], key: "v" }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
