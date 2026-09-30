import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { detectProvider, fetchAllSnapshots, fetchSnapshot } from "@/adapters";
import { mapPool } from "@/lib/async-pool";
import { SiteDetail } from "@/components/site-detail";
import { SiteForm } from "@/components/site-form";
import { useSites, type SiteInput } from "@/hooks/use-sites";
import { indicatorListIcon } from "@/lib/status-colors";
import {
  suggestedSiteIcon,
  unusedSuggestedSitesBySection,
  type SuggestedSite,
} from "@/lib/suggested-sites";
import { normalizeSiteUrl } from "@/lib/url";
import type { MonitoredSite, StatusSnapshot } from "@/types";

export default function Command() {
  const {
    sites,
    isLoading: isLoadingSites,
    addSite,
    addSites,
    deleteSite,
    updateSite,
  } = useSites();
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [addingUrls, setAddingUrls] = useState<string[]>([]);

  const {
    data: snapshots,
    isLoading: isLoadingSnapshots,
    error: snapshotsError,
    revalidate,
  } = useCachedPromise(
    async (siteList: MonitoredSite[]) => {
      if (siteList.length === 0) {
        return {} as Record<string, StatusSnapshot>;
      }
      return fetchAllSnapshots(siteList);
    },
    [sites],
    { keepPreviousData: true },
  );

  const suggestedSections = unusedSuggestedSitesBySection(
    sites.map((site) => site.url),
  );
  const suggestedSites = suggestedSections.flatMap((section) => section.sites);
  const selectedSet = new Set(
    selectedUrls.filter((url) =>
      suggestedSites.some((site) => site.url === url),
    ),
  );
  const selectedSites = suggestedSites.filter((site) =>
    selectedSet.has(site.url),
  );
  const showSuggestions = !isLoadingSites && suggestedSites.length > 0;
  const isAddingSuggested = addingUrls.length > 0;
  const isLoading = isLoadingSites || isLoadingSnapshots || isAddingSuggested;

  async function handleSaveNewSite(values: SiteInput) {
    await addSite(values);
  }

  function toggleSelected(url: string) {
    setSelectedUrls((current) =>
      current.includes(url)
        ? current.filter((item) => item !== url)
        : [...current, url],
    );
  }

  function selectAllSuggested() {
    setSelectedUrls(suggestedSites.map((site) => site.url));
  }

  function selectAllInSection(sectionSites: SuggestedSite[]) {
    setSelectedUrls((current) => {
      const next = new Set(current);
      for (const site of sectionSites) {
        next.add(site.url);
      }
      return [...next];
    });
  }

  function clearSelection() {
    setSelectedUrls([]);
  }

  async function handleAddSuggested(sitesToAdd: SuggestedSite[]) {
    if (addingUrls.length > 0 || sitesToAdd.length === 0) {
      return;
    }

    setAddingUrls(sitesToAdd.map((site) => site.url));

    try {
      const results = await mapPool(sitesToAdd, 2, async (site) => {
        try {
          return { ok: true as const, value: await resolveSuggestedSite(site) };
        } catch {
          return { ok: false as const, name: site.name };
        }
      });
      const succeeded: SiteInput[] = [];
      const failed: string[] = [];

      for (const result of results) {
        if (result.ok) {
          succeeded.push(result.value);
        } else {
          failed.push(result.name);
        }
      }

      if (succeeded.length > 0) {
        await addSites(succeeded);
      }

      setSelectedUrls([]);

      if (failed.length > 0 && succeeded.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Added ${succeeded.length}, failed ${failed.length}`,
          message: failed.join(", "),
        });
      } else if (failed.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title:
            failed.length === 1 ? "Failed to add site" : "Failed to add sites",
          message: failed.join(", "),
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title:
            succeeded.length === 1
              ? "Site added"
              : `${succeeded.length} sites added`,
          message: succeeded.map((site) => site.name).join(", "),
        });
      }
    } finally {
      setAddingUrls([]);
    }
  }

  async function handleDelete(site: MonitoredSite) {
    await deleteSite(site.id);
    await showToast({ style: Toast.Style.Success, title: "Site removed" });
  }

  const monitoredItems = sites.map((site) => {
    const snapshot = snapshots?.[site.id];
    const hasSnapshotError = Boolean(snapshot?.error);
    const hasLoadError = Boolean(snapshotsError && !snapshot);
    const hasError = hasSnapshotError || hasLoadError;
    const icon = hasError
      ? { source: Icon.QuestionMark, tintColor: Color.SecondaryText }
      : indicatorListIcon(snapshot?.indicator ?? "unknown");

    const subtitle = hasSnapshotError
      ? "Fetch failed. Press Enter to retry."
      : hasLoadError
        ? "Load failed. Press Enter to retry."
        : (snapshot?.overallDescription ?? "Loading...");

    return (
      <List.Item
        key={site.id}
        title={site.name}
        subtitle={subtitle}
        icon={icon}
        accessories={[
          ...(snapshot?.incidents?.length
            ? [
                {
                  icon: Icon.Warning,
                  tooltip: `${snapshot.incidents.length} active incident${snapshot.incidents.length === 1 ? "" : "s"}`,
                },
              ]
            : []),
          ...(snapshot?.fetchedAt
            ? [
                {
                  date: new Date(snapshot.fetchedAt),
                  tooltip: "Last fetched",
                },
              ]
            : []),
        ]}
        actions={
          <ActionPanel>
            {snapshot && !hasError ? (
              <Action.Push
                title="View Status Details"
                icon={Icon.Eye}
                target={<SiteDetail site={site} />}
              />
            ) : (
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            )}
            <AddSiteAction onSave={handleSaveNewSite} />
            <Action.Push
              title="Edit Site"
              icon={Icon.Pencil}
              target={
                <SiteForm
                  site={site}
                  onSave={(values) => updateSite(site.id, values)}
                />
              }
            />
            <Action
              title="Delete Site"
              shortcut={{ modifiers: ["ctrl"], key: "delete" }}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => handleDelete(site)}
            />
            <Action
              title="Refresh All"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        showSuggestions && sites.length === 0
          ? "Search suggested sites..."
          : "Search monitored sites..."
      }
    >
      <List.EmptyView
        title={
          showSuggestions ? "No matching suggestions" : "No matching sites"
        }
        description={
          showSuggestions
            ? "Clear the search to browse suggested status pages, or add a custom URL."
            : "Add a status page URL to monitor services like Claude, GitHub, or Railway."
        }
        actions={
          <ActionPanel>
            <AddSiteAction onSave={handleSaveNewSite} />
          </ActionPanel>
        }
      />

      {sites.length > 0 && showSuggestions ? (
        <List.Section title="Monitored">{monitoredItems}</List.Section>
      ) : (
        monitoredItems
      )}

      {showSuggestions &&
        suggestedSections.map((section, index) => {
          const selectedInSection = section.sites.filter((site) =>
            selectedSet.has(site.url),
          ).length;

          return (
            <List.Section
              key={section.category}
              title={section.title}
              subtitle={
                selectedInSection > 0
                  ? `${selectedInSection} selected · ⌘↵ to add`
                  : index === 0
                    ? "Enter to select · ⌘↵ to add"
                    : undefined
              }
            >
              {section.sites.map((site) => {
                const isSelected = selectedSet.has(site.url);
                const isAddingSite = addingUrls.includes(site.url);

                return (
                  <List.Item
                    key={site.url}
                    title={site.name}
                    subtitle={site.url}
                    icon={suggestedSiteIcon(site)}
                    keywords={[site.url, new URL(site.url).hostname]}
                    accessories={[
                      {
                        icon: isSelected
                          ? { source: Icon.CheckCircle, tintColor: Color.Green }
                          : Icon.Circle,
                        tooltip: isSelected ? "Selected" : "Not selected",
                      },
                      ...(isAddingSite ? [{ text: "Adding..." }] : []),
                    ]}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section>
                          <Action
                            title={isSelected ? "Deselect" : "Select"}
                            icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                            onAction={() => toggleSelected(site.url)}
                          />
                          <Action
                            title={
                              selectedSites.length > 0
                                ? `Add ${selectedSites.length} Site${selectedSites.length === 1 ? "" : "s"}`
                                : "Add Site"
                            }
                            icon={Icon.Plus}
                            shortcut={{ modifiers: ["cmd"], key: "return" }}
                            onAction={() =>
                              handleAddSuggested(
                                selectedSites.length > 0
                                  ? selectedSites
                                  : [site],
                              )
                            }
                          />
                        </ActionPanel.Section>
                        <ActionPanel.Section>
                          <Action
                            title={`Select All ${section.title}`}
                            icon={Icon.CheckList}
                            onAction={() => selectAllInSection(section.sites)}
                          />
                          <Action
                            title="Select All"
                            icon={Icon.CheckList}
                            onAction={selectAllSuggested}
                          />
                          {selectedSites.length > 0 && (
                            <Action
                              title="Clear Selection"
                              icon={Icon.XMarkCircle}
                              onAction={clearSelection}
                            />
                          )}
                          <AddSiteAction
                            title="Add Custom URL"
                            onSave={handleSaveNewSite}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        })}
    </List>
  );
}

async function resolveSuggestedSite(site: SuggestedSite): Promise<SiteInput> {
  const url = normalizeSiteUrl(site.url);
  const provider = await detectProvider(url);
  const snapshot = await fetchSnapshot({ url, provider });

  if (snapshot.error) {
    throw new Error(snapshot.error);
  }

  return {
    name: site.name,
    url,
    provider,
  };
}

function AddSiteAction({
  title = "Add Site",
  onSave,
}: {
  title?: string;
  onSave: (values: SiteInput) => Promise<void>;
}) {
  return (
    <Action.Push
      title={title}
      icon={Icon.Plus}
      target={<SiteForm onSave={onSave} />}
    />
  );
}
