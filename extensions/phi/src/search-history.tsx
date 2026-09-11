import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
} from "@raycast/api";
import { getFavicon, usePromise } from "@raycast/utils";
import { useState } from "react";
import { runPhiCommandAction } from "./command-compatibility";
import { PhiErrorView } from "./components/error-view";
import {
  getChromiumDataDirectoryIfRunning,
  openTab,
  parseApplicationChannel,
} from "./phi";
import {
  createPhiHistorySource,
  HistorySource,
  phiHistoryBasePath,
} from "./history";
import { runWithPhiInvocation } from "./invocation-context";
import { resolveTabFaviconURL } from "./tab-utils";
import { formatURLHost } from "./url-utils";
import { usePhiHistory } from "./use-history-search";
import { runViewAction } from "./window-command";

function HistoryErrorView({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => Promise<void>;
}) {
  return (
    <Detail
      markdown={`# Could Not Read Phi History\n\n${error.message}`}
      actions={
        <ActionPanel>
          <Action
            title="Try Again"
            icon={Icon.ArrowClockwise}
            onAction={onRetry}
          />
        </ActionPanel>
      }
    />
  );
}

function HistoryResults({
  source,
  searchText,
  setSearchText,
  isResolvingSource,
  refreshSource,
}: {
  source: HistorySource;
  searchText: string;
  setSearchText: (value: string) => void;
  isResolvingSource: boolean;
  refreshSource: () => Promise<HistorySource>;
}) {
  const { data, isLoading, permissionView, error, revalidate } = usePhiHistory(
    searchText,
    source.profiles,
  );
  const refresh = async () => {
    await Promise.all([revalidate(), refreshSource()]);
  };

  if (permissionView) {
    return permissionView;
  }
  if (error) {
    return <HistoryErrorView error={error} onRetry={refresh} />;
  }

  return (
    <List
      filtering={false}
      isLoading={isLoading || isResolvingSource}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Phi history by title or URL"
      throttle
    >
      {data.map((entry) => {
        const faviconURL = resolveTabFaviconURL(entry.url);
        const displayHost = formatURLHost(entry.url);
        return (
          <List.Item
            key={`${entry.profileId}:${entry.id}`}
            title={entry.title || displayHost || "Untitled"}
            subtitle={displayHost}
            icon={
              faviconURL
                ? getFavicon(faviconURL, { fallback: Icon.Globe })
                : Icon.Globe
            }
            accessories={[
              {
                date: entry.lastVisitedAt,
                tooltip: "Last visited",
              },
              ...(entry.profileName
                ? [
                    {
                      tag: {
                        value: entry.profileName,
                        color: Color.Blue,
                      },
                      tooltip: "Profile",
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Phi"
                  icon={Icon.Window}
                  onAction={() =>
                    runViewAction(
                      () =>
                        runPhiCommandAction(
                          "search-history",
                          "open-history-entry",
                          () => openTab(entry.url),
                        ),
                      "Could Not Open History Entry",
                      "Try again.",
                    )
                  }
                />
                <Action.CopyToClipboard title="Copy URL" content={entry.url} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={refresh}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {data.length === 0 && !isLoading ? (
        <List.EmptyView
          title={
            searchText.trim().length > 0
              ? "No Matching History"
              : "No Phi History Found"
          }
          description={
            searchText.trim().length > 0
              ? "Try a different title or URL."
              : `No History entries were found in ${source.profiles.length} profile${source.profiles.length === 1 ? "" : "s"} at ${source.basePath}.`
          }
          icon={Icon.Clock}
        />
      ) : null}
    </List>
  );
}

export default function SearchHistory(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const preferences = getPreferenceValues<Preferences>();
  const channel = parseApplicationChannel(preferences.applicationChannel);
  const {
    data: source,
    error,
    isLoading,
    revalidate,
  } = usePromise(async (): Promise<HistorySource> =>
    runWithPhiInvocation({ clientCommand: "search-history" }, async () => {
      const queriedPath = await getChromiumDataDirectoryIfRunning();
      return createPhiHistorySource(queriedPath ?? phiHistoryBasePath(channel));
    }),
  );

  if (error) {
    return <PhiErrorView error={error} onRetry={revalidate} />;
  }
  if (!source) {
    return <List isLoading={isLoading} />;
  }

  const sourceKey = [
    source.basePath,
    ...source.profiles.map((profile) => profile.historyDatabasePath),
  ].join("\u0000");

  return (
    <HistoryResults
      key={sourceKey}
      source={source}
      searchText={searchText}
      setSearchText={setSearchText}
      isResolvingSource={isLoading}
      refreshSource={revalidate}
    />
  );
}
