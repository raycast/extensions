import { ActionPanel, Action, List, Color, Detail, showToast, Toast, Icon } from "@raycast/api";
import { usePromise, useFetch, useCachedState, showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import Fuse from "fuse.js";
import {
  getPackageContentsUrl,
  getPackageContentsOptions,
  parsePackageContentsResponse,
  FHIRPackageContent,
  FHIRResourceDetail,
} from "./utils/fhir-registry-api";
import {
  getPinnedPackages,
  getCorePackages,
  initializePinnedPackages,
  getPinnedResources,
  pinResource,
  unpinResource,
  PinnedResource,
} from "./utils/storage";

export default function SearchDocumentation() {
  const [selectedPackageId, setSelectedPackageId] = useCachedState<string>("selected-package-id", "");
  const [pinnedResources, setPinnedResources] = useState<PinnedResource[]>([]);
  const [pinnedResourceIds, setPinnedResourceIds] = useState<Set<string>>(new Set());

  // Get core and pinned packages
  const { data: packages, isLoading: isLoadingPackages } = usePromise(async () => {
    await initializePinnedPackages();
    return await getPinnedPackages();
  }, []);

  const corePackages = getCorePackages();

  // Load pinned resources
  const loadPinnedResources = async () => {
    const pinned = await getPinnedResources();
    setPinnedResources(pinned);
    setPinnedResourceIds(new Set(pinned.map((r) => r.id)));
  };

  // Load pinned resources on component mount and when package changes
  useEffect(() => {
    loadPinnedResources();
  }, [selectedPackageId]); // Add selectedPackageId as dependency

  const defaultPackageId = corePackages.find((pkg) => pkg.id.includes("hl7.fhir.r5.core"))?.id || corePackages[0]?.id;

  // Get package contents when a package is selected
  const shouldFetchContents = Boolean(selectedPackageId);
  const { data: packageContentsData, isLoading: isLoadingResources } = useFetch(
    getPackageContentsUrl(selectedPackageId),
    {
      ...getPackageContentsOptions(),
      keepPreviousData: true,
      execute: shouldFetchContents,
    },
  );

  // Search state
  const [searchText, setSearchText] = useState("");

  const resources = packageContentsData ? parsePackageContentsResponse(packageContentsData) : [];
  const handlePackageChange = (packageId: string) => {
    setSelectedPackageId(packageId);
  };

  const handlePinResource = async (resource: FHIRPackageContent | PinnedResource) => {
    try {
      const resourceId = `${resource.id}-${selectedPackageId}`;
      const selectedPkg =
        packages?.find((p) => p.id === selectedPackageId) || corePackages.find((p) => p.id === selectedPackageId);

      if (!selectedPkg) return;

      await pinResource({
        id: resourceId,
        packageId: selectedPackageId,
        resourceId: "resourceId" in resource ? resource.resourceId : resource.id,
        title: resource.title,
        canonical: resource.canonical,
        jsonUrl: resource.jsonUrl,
        simplifierUrl: resource.simplifierUrl,
        resourceType: resource.resourceType,
        packageName: "packageName" in resource ? resource.packageName : selectedPkg.name,
      });

      await loadPinnedResources();

      await showToast({
        style: Toast.Style.Success,
        title: "Resource pinned",
        message: `${resource.title} has been pinned`,
      });
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to pin resource",
      });
    }
  };

  const handleUnpinResource = async (resourceId: string) => {
    try {
      await unpinResource(resourceId);
      await loadPinnedResources();

      await showToast({
        style: Toast.Style.Success,
        title: "Resource unpinned",
        message: "Resource has been unpinned",
      });
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to unpin resource",
      });
    }
  };

  // Resource type importance weighting
  const getResourceTypeWeight = (resourceType: string): number => {
    switch (resourceType?.toLowerCase()) {
      case "structuredefinition":
        return 3.0;
      case "valueset":
      case "codesystem":
        return 2.5;
      case "extension":
        return 2.0;
      case "searchparameter":
        return 1.5;
      case "operationdefinition":
        return 1.2;
      default:
        return 1.0;
    }
  };

  // Enhanced search filtering with fuzzy matching and weighting
  let filteredResources = resources || [];
  if (searchText.trim()) {
    // Configure Fuse.js for fuzzy search
    const fuse = new Fuse(filteredResources, {
      keys: [{ name: "title", weight: 1.0 }],
      threshold: 0.4,
      distance: 100,
      includeScore: true,
    });

    const fuseResults = fuse.search(searchText);

    const scoredResults = fuseResults.map((result) => ({
      item: result.item,
      combinedScore: (result.score || 0) / getResourceTypeWeight(result.item.resourceType),
    }));

    scoredResults.sort((a, b) => a.combinedScore - b.combinedScore);

    filteredResources = scoredResults.map((scored) => scored.item);
  } else {
    // When no search, sort by resource type importance
    filteredResources = filteredResources.sort((a, b) => {
      const weightA = getResourceTypeWeight(a.resourceType);
      const weightB = getResourceTypeWeight(b.resourceType);
      if (weightA !== weightB) {
        return weightB - weightA; // Higher weight first
      }
      return a.title.localeCompare(b.title); // Then alphabetical
    });
  }

  const filteredResourcesCount = filteredResources.length;

  // Limit to 50 items max to prevent memory issues
  filteredResources = filteredResources.slice(0, 50);

  // Filter pinned resources for current package and search
  const filteredPinnedResources = pinnedResources
    .filter((resource) => resource.packageId === selectedPackageId) // Only show resources for current package
    .filter((resource) => {
      if (!searchText.trim()) return true;
      const searchLower = searchText.toLowerCase();
      return (
        resource.title.toLowerCase().includes(searchLower) || resource.resourceType.toLowerCase().includes(searchLower)
      );
    });

  // Filter out pinned resources from regular results to avoid duplicates
  const nonPinnedResources = filteredResources.filter((r) => {
    const resourceId = `${r.id}-${selectedPackageId}`;
    return !pinnedResourceIds.has(resourceId);
  });

  return (
    <List
      isLoading={isLoadingPackages || isLoadingResources}
      searchBarPlaceholder="Search FHIR resources..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Package"
          value={selectedPackageId}
          onChange={handlePackageChange}
          storeValue
          defaultValue={defaultPackageId}
          placeholder="Select Package"
        >
          <List.Dropdown.Section title="Core">
            {corePackages.map((pkg) => (
              <List.Dropdown.Item key={pkg.id} title={pkg.title || pkg.id} value={pkg.id} />
            ))}
          </List.Dropdown.Section>
          {packages && packages.length > 0 && (
            <List.Dropdown.Section title="Pinned">
              {packages.map((pkg) => (
                <List.Dropdown.Item key={pkg.id} title={pkg.title || pkg.id} value={pkg.id} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {filteredPinnedResources.length === 0 && nonPinnedResources.length === 0 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No Resources Found" />
      ) : (
        <>
          {filteredPinnedResources.length > 0 && (
            <List.Section title="Pinned" subtitle={filteredPinnedResources.length.toString()}>
              {filteredPinnedResources.map((resource) => {
                return (
                  <FHIRResourceListItem
                    key={resource.id}
                    resource={resource}
                    isPinned={true}
                    onPin={() => handlePinResource(resource)}
                    onUnpin={() => handleUnpinResource(resource.id)}
                  />
                );
              })}
            </List.Section>
          )}
          {nonPinnedResources.length > 0 && (
            <List.Section
              title="Results"
              subtitle={(filteredResourcesCount - filteredPinnedResources.length).toString()}
            >
              {nonPinnedResources.map((resource) => {
                const resourceId = `${resource.id}-${selectedPackageId}`;
                return (
                  <FHIRResourceListItem
                    key={resource.id || resourceId}
                    resource={resource}
                    isPinned={false}
                    onPin={() => handlePinResource(resource)}
                    onUnpin={() => handleUnpinResource(resourceId)}
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function FHIRResourceListItem({
  resource,
  isPinned,
  onPin,
  onUnpin,
}: {
  resource: FHIRPackageContent | PinnedResource;
  isPinned?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
}) {
  const title = resource.title;
  const keywords = [
    resource.title,
    resource.resourceType,
    "category" in resource ? resource.category : undefined,
    "fileName" in resource ? resource.fileName : undefined,
  ].filter(Boolean) as string[];

  const getResourceTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "structuredefinition":
        return Color.Blue;
      case "valueset":
        return Color.Green;
      case "codesystem":
        return Color.Orange;
      case "searchparameter":
        return Color.Purple;
      case "operationdefinition":
        return Color.Red;
      case "extension":
        return Color.Yellow;
      default:
        return Color.SecondaryText;
    }
  };

  return (
    <List.Item
      title={title}
      subtitle={resource.canonical}
      keywords={keywords}
      accessories={[
        {
          tag: {
            value: resource.resourceType || ("category" in resource ? resource.category : undefined) || "Unknown",
            color: getResourceTypeColor(
              resource.resourceType || ("category" in resource ? resource.category : undefined) || "Unknown",
            ),
          },
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Details"
              icon={Icon.Eye}
              target={
                <ResourceDetail
                  resource={resource as FHIRPackageContent}
                  isPinned={isPinned}
                  onPin={onPin}
                  onUnpin={onUnpin}
                />
              }
            />
            <Action.OpenInBrowser url={resource.canonical} />
            {isPinned && onUnpin ? (
              <Action title="Unpin Resource" icon={Icon.PinDisabled} onAction={onUnpin} />
            ) : onPin ? (
              <Action title="Pin Resource" icon={Icon.Pin} onAction={onPin} />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Open in Browser">
            {/* eslint-disable-next-line @raycast/prefer-title-case */}
            <Action.OpenInBrowser title="simplifier.net" url={resource.simplifierUrl} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ResourceDetail({
  resource,
  isPinned,
  onPin,
  onUnpin,
}: {
  resource: FHIRPackageContent;
  isPinned?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
}) {
  const {
    data: detail,
    isLoading,
    error,
  } = useFetch<FHIRResourceDetail>(resource.jsonUrl, {
    onError: async (error) => {
      await showFailureToast(error, {
        title: "Failed to load resource details",
      });
    },
  });

  if (isLoading) {
    return <Detail isLoading={true} navigationTitle={resource.title} />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error Loading Resource\n\n${error.message}`}
        navigationTitle={resource.title}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={resource.canonical} />
          </ActionPanel>
        }
      />
    );
  }

  return <ResourceDetailView resource={resource} detail={detail} isPinned={isPinned} onPin={onPin} onUnpin={onUnpin} />;
}

function ResourceDetailView({
  resource,
  detail,
  isPinned,
  onPin,
  onUnpin,
}: {
  resource: FHIRPackageContent;
  detail?: FHIRResourceDetail;
  isPinned?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return Color.Green;
      case "draft":
        return Color.Orange;
      case "retired":
        return Color.SecondaryText;
      case "unknown":
        return Color.Yellow;
      default:
        return undefined;
    }
  };

  const title = detail?.title || detail?.name || resource.title;
  let markdownContent = `## ${title}`;

  if (detail?.description) {
    markdownContent += `\n\n### Description\n\n${detail?.description}`;
  }

  if (detail?.purpose) {
    markdownContent += `\n\n### Purpose\n\n${detail?.purpose}`;
  }

  if (detail?.url) {
    markdownContent += `\n\n### URL\n\n${detail?.url}`;
  }

  return (
    <Detail
      markdown={markdownContent}
      navigationTitle={title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Resource Type">
            <Detail.Metadata.TagList.Item text={detail?.resourceType || resource.resourceType || "Unknown"} />
          </Detail.Metadata.TagList>

          {detail?.status && (
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text={detail.status} color={getStatusColor(detail.status)} />
              {detail.experimental && <Detail.Metadata.TagList.Item text="experimental" color={Color.Red} />}
            </Detail.Metadata.TagList>
          )}

          <Detail.Metadata.Separator />

          {detail?.version && <Detail.Metadata.Label title="Version" text={detail.version} />}

          {detail?.publisher && <Detail.Metadata.Label title="Publisher" text={detail.publisher} />}

          {detail?.date && <Detail.Metadata.Label title="Date" text={new Date(detail.date).toLocaleDateString()} />}

          {detail?.contact && detail.contact.length > 0 && (
            <Detail.Metadata.Label
              title="Contact"
              text={detail.contact[0].name || detail.contact[0].telecom?.[0]?.value || "Available"}
            />
          )}

          {detail?.jurisdiction && detail.jurisdiction.length > 0 && (
            <Detail.Metadata.Label
              title="Jurisdiction"
              text={detail.jurisdiction
                .map((j) => j.coding?.[0]?.display || j.coding?.[0]?.code || "Specified")
                .join(", ")}
            />
          )}

          {detail?.mapping && detail.mapping.length > 0 && (
            <Detail.Metadata.TagList title="Mappings">
              {detail.mapping.map((m) => (
                <Detail.Metadata.TagList.Item key={m.name || m.identity} text={m.name || m.identity} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={resource.canonical} />
            {isPinned && onUnpin ? (
              <Action title="Unpin Resource" icon={Icon.PinDisabled} onAction={onUnpin} />
            ) : onPin ? (
              <Action title="Pin Resource" icon={Icon.Pin} onAction={onPin} />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Open in Browser">
            {/* eslint-disable-next-line @raycast/prefer-title-case */}
            <Action.OpenInBrowser title="simplifier.net" url={resource.simplifierUrl} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy to Clipboard">
            <Action.CopyToClipboard
              title="URL"
              content={resource.canonical}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            {detail?.id && (
              <Action.CopyToClipboard
                title="ID"
                content={detail.id}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
