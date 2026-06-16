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
import { fetchAllSnapshots } from "@/adapters";
import { SiteDetail } from "@/components/site-detail";
import { SiteForm } from "@/components/site-form";
import { useSites } from "@/hooks/use-sites";
import { indicatorListIcon } from "@/lib/status-colors";
import type { MonitoredSite, StatusSnapshot } from "@/types";

export default function Command() {
  const {
    sites,
    isLoading: isLoadingSites,
    addSite,
    deleteSite,
    updateSite,
  } = useSites();

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

  const isLoading = isLoadingSites || isLoadingSnapshots;

  async function handleDelete(site: MonitoredSite) {
    await deleteSite(site.id);
    await showToast({ style: Toast.Style.Success, title: "Site removed" });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search monitored sites..."
    >
      <List.EmptyView
        title="No sites yet"
        description="Add a status page URL to monitor services like Claude, GitHub, or Railway."
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Site"
              icon={Icon.Plus}
              target={
                <SiteForm
                  onSave={async (values) => {
                    await addSite(values);
                  }}
                />
              }
            />
          </ActionPanel>
        }
      />

      {sites.map((site) => {
        const snapshot = snapshots?.[site.id];
        const hasSnapshotError = Boolean(snapshot?.error);
        const hasLoadError = Boolean(snapshotsError && !snapshot);
        const hasError = hasSnapshotError || hasLoadError;
        const icon = hasError
          ? { source: Icon.QuestionMark, tintColor: Color.SecondaryText }
          : indicatorListIcon(snapshot?.indicator ?? "unknown");

        const subtitle = hasSnapshotError
          ? "Failed to fetch — retry"
          : hasLoadError
            ? "Failed to load — retry"
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
                      tooltip: `${snapshot.incidents.length} active incident(s)`,
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
                    target={<SiteDetail snapshot={snapshot} />}
                  />
                ) : (
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                  />
                )}
                <Action.Push
                  title="Add Site"
                  icon={Icon.Plus}
                  target={
                    <SiteForm
                      onSave={async (values) => {
                        await addSite(values);
                      }}
                    />
                  }
                />
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
      })}
    </List>
  );
}
