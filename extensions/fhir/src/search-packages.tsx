import { ActionPanel, Action, List, showToast, Toast, Color, Icon } from "@raycast/api";
import { useFetch, showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import {
  getSearchPackagesUrl,
  getSearchPackagesOptions,
  parseSearchPackagesResponse,
  FHIRPackage,
} from "./utils/fhir-registry-api";
import { pinPackage, unpinPackage, getPinnedPackages, getCorePackages, PinnedPackage } from "./utils/storage";

export default function SearchPackages() {
  const [searchText, setSearchText] = useState("");
  const [pinnedPackages, setPinnedPackages] = useState<PinnedPackage[]>([]);
  const [pinnedPackageIds, setPinnedPackageIds] = useState<Set<string>>(new Set());

  const corePackages = getCorePackages();
  const corePackageIds = new Set(corePackages.map((p) => p.id));

  const shouldSearch = searchText.trim().length > 0;

  const {
    data: searchData,
    isLoading,
    error,
  } = useFetch(getSearchPackagesUrl(), {
    ...getSearchPackagesOptions(searchText || ""),
    keepPreviousData: true,
    execute: shouldSearch,
  });

  const packages = searchData ? parseSearchPackagesResponse(searchData) : [];

  // Load pinned packages
  const loadPinnedPackages = async () => {
    const pinned = await getPinnedPackages();
    setPinnedPackages(pinned);
    setPinnedPackageIds(new Set(pinned.map((p) => p.id)));
  };

  // Load pinned packages on component mount
  useEffect(() => {
    loadPinnedPackages();
  }, []);

  const handlePinPackage = async (pkg: FHIRPackage | PinnedPackage) => {
    try {
      await pinPackage({
        id: pkg.id,
        name: pkg.name,
        title: pkg.title,
        version: pkg.version,
        description: pkg.description,
        canonical: pkg.canonical,
        url: pkg.url,
        publisher: pkg.publisher,
        author: pkg.author,
        fhirMajorVersion: pkg.fhirMajorVersion,
      });

      await loadPinnedPackages(); // Refresh pinned packages

      await showToast({
        style: Toast.Style.Success,
        title: "Package pinned",
        message: `${pkg.name} has been pinned`,
      });
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to pin package",
      });
    }
  };

  const handleUnpinPackage = async (pkg: FHIRPackage | PinnedPackage) => {
    try {
      await unpinPackage(pkg.id);
      await loadPinnedPackages(); // Refresh pinned packages

      await showToast({
        style: Toast.Style.Success,
        title: "Package unpinned",
        message: `${pkg.name} has been unpinned`,
      });
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to unpin package",
      });
    }
  };

  const getPackageTypeColor = (name: string) => {
    if (name.includes("hl7.fhir") && name.includes("core")) {
      return Color.Blue;
    }
    return Color.Green;
  };

  if (error) {
    return (
      <List searchBarPlaceholder="Search FHIR packages...">
        <List.EmptyView icon={Icon.ExclamationMark} title="Search Error" description={error.message} />
      </List>
    );
  }

  // Filter core packages when searching
  const filteredCorePackages =
    searchText && searchText.trim()
      ? corePackages.filter((pkg) => {
          const searchLower = searchText.toLowerCase();
          return (
            pkg.name?.toLowerCase().includes(searchLower) ||
            pkg.title?.toLowerCase().includes(searchLower) ||
            pkg.description?.toLowerCase().includes(searchLower)
          );
        })
      : corePackages;

  // Filter pinned packages when searching
  const filteredPinnedPackages =
    searchText && searchText.trim()
      ? pinnedPackages.filter((pkg) => {
          const searchLower = searchText.toLowerCase();
          return (
            pkg.name?.toLowerCase().includes(searchLower) ||
            pkg.title?.toLowerCase().includes(searchLower) ||
            pkg.description?.toLowerCase().includes(searchLower)
          );
        })
      : pinnedPackages;

  // Filter out core and pinned packages from search results to avoid duplicates
  const nonPinnedPackages =
    packages?.filter((pkg) => !pinnedPackageIds.has(pkg.id) && !corePackageIds.has(pkg.id)) || [];

  const showingResults = searchText && searchText.trim().length > 0;
  const totalResults = showingResults
    ? filteredCorePackages.length + filteredPinnedPackages.length + nonPinnedPackages.length
    : filteredCorePackages.length + filteredPinnedPackages.length;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search FHIR packages..."
      throttle
      filtering={false}
      isShowingDetail
    >
      {totalResults === 0 && showingResults ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No Packages Found" />
      ) : (
        <>
          {filteredCorePackages.length > 0 && (
            <List.Section title="Core">
              {filteredCorePackages.map((pkg) => (
                <PackageListItem
                  key={pkg.id}
                  pkg={pkg}
                  isPinned={false}
                  isCore={true}
                  onPin={() => handlePinPackage(pkg)}
                  onUnpin={() => handleUnpinPackage(pkg)}
                  getPackageTypeColor={getPackageTypeColor}
                />
              ))}
            </List.Section>
          )}
          {filteredPinnedPackages.length > 0 && (
            <List.Section title="Pinned">
              {filteredPinnedPackages.map((pkg) => (
                <PackageListItem
                  key={pkg.id}
                  pkg={pkg}
                  isPinned={true}
                  isCore={false}
                  onPin={() => handlePinPackage(pkg)}
                  onUnpin={() => handleUnpinPackage(pkg)}
                  getPackageTypeColor={getPackageTypeColor}
                />
              ))}
            </List.Section>
          )}
          {showingResults && nonPinnedPackages.length > 0 && (
            <List.Section title="Results">
              {nonPinnedPackages.map((pkg) => (
                <PackageListItem
                  key={pkg.id}
                  pkg={pkg}
                  isPinned={false}
                  isCore={false}
                  onPin={() => handlePinPackage(pkg)}
                  onUnpin={() => handleUnpinPackage(pkg)}
                  getPackageTypeColor={getPackageTypeColor}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

interface PackageListItemProps {
  pkg: FHIRPackage | PinnedPackage;
  isPinned: boolean;
  isCore: boolean;
  onPin: () => void;
  onUnpin: () => void;
  getPackageTypeColor: (name: string) => Color;
}

function PackageListItem({ pkg, isPinned, isCore, onPin, onUnpin, getPackageTypeColor }: PackageListItemProps) {
  const registryFHIRUrl = `https://registry.fhir.org/package/${pkg.id}`;
  const simplifierUrl = `https://simplifier.net/packages/${pkg.name}/${pkg.version}`;

  return (
    <List.Item
      title={pkg.name}
      subtitle={pkg.title}
      accessories={isCore ? [{ text: "Core", tooltip: "Core Package" }] : []}
      detail={
        <List.Item.Detail
          {...(pkg.description && {
            markdown: `### ${pkg.title || pkg.name || pkg.id}\n\n${pkg.description}`,
          })}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Name">
                <List.Item.Detail.Metadata.TagList.Item text={pkg.name} color={getPackageTypeColor(pkg.name)} />
              </List.Item.Detail.Metadata.TagList>

              {pkg.title && <List.Item.Detail.Metadata.Label title="Title" text={pkg.title} />}

              <List.Item.Detail.Metadata.TagList title="Version">
                <List.Item.Detail.Metadata.TagList.Item text={pkg.version} />
              </List.Item.Detail.Metadata.TagList>

              {pkg.fhirMajorVersion.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="FHIR Version">
                  {pkg.fhirMajorVersion.map((version) => (
                    <List.Item.Detail.Metadata.TagList.Item key={version} text={`R${version}`} color={Color.Blue} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}

              <List.Item.Detail.Metadata.Separator />

              {pkg.url && <List.Item.Detail.Metadata.Link title="URL" target={pkg.url} text={pkg.url} />}

              {pkg.publisher && <List.Item.Detail.Metadata.Label title="Publisher" text={pkg.publisher} />}

              {pkg.author && <List.Item.Detail.Metadata.Label title="Author" text={pkg.author} />}

              {"totalDownloads" in pkg && (
                <List.Item.Detail.Metadata.Label title="Downloads" text={pkg.totalDownloads.toLocaleString()} />
              )}

              {"date" in pkg && (
                <List.Item.Detail.Metadata.Label title="Published" text={new Date(pkg.date).toLocaleDateString()} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={pkg.url || simplifierUrl} />
            {isCore ? null : isPinned ? (
              <Action title="Unpin Package" icon={Icon.PinDisabled} onAction={onUnpin} />
            ) : (
              <Action title="Pin Package" icon={Icon.Pin} onAction={onPin} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Open in Browser">
            {/* eslint-disable-next-line @raycast/prefer-title-case */}
            <Action.OpenInBrowser title="simplifier.net" url={simplifierUrl} />
            {/* eslint-disable-next-line @raycast/prefer-title-case */}
            <Action.OpenInBrowser title="registry.fhir.org" url={registryFHIRUrl} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy to Clipboard">
            <Action.CopyToClipboard title="ID" content={pkg.id} />
            <Action.CopyToClipboard title="Name" content={pkg.name} />
            {pkg.url && <Action.CopyToClipboard title="URL" content={pkg.url} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
