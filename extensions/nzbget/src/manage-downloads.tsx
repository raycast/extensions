import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getAPIURL, getDownloadIcon } from "./lib/get-preferences";
import { useFetch } from "@raycast/utils";
import { useEffect } from "react";
import { cancelDownload, pauseDownload, resumeDownload, type ListGroupsResult } from "./lib/downloads";

export default function Command() {
  const { data, isLoading, revalidate } = useFetch<ListGroupsResult>(getAPIURL("/jsonrpc/listgroups"), {});

  useEffect(() => {
    const interval = setInterval(revalidate, 1000);
    return () => clearInterval(interval);
  }, [revalidate]);

  return (
    <List isLoading={isLoading}>
      {data?.result.map((group) => (
        <List.Item
          key={group.NZBID}
          icon={{ value: getDownloadIcon(group.Status), tooltip: group.Status }}
          title={group.NZBName}
          accessories={[
            { tag: { value: group.Category, color: Color.Green } },
            {
              tag: {
                value: `${group.FileSizeMB - group.RemainingSizeMB} of ${group.FileSizeMB} MB`,
                color: Color.Blue,
              },
            },
          ]}
          actions={
            <ActionPanel>
              {group.Status === "DOWNLOADING" && (
                <>
                  <Action title="Pause" onAction={() => pauseDownload(group.NZBID).then(() => revalidate())} />
                  <Action title="Cancel" onAction={() => cancelDownload(group.NZBID).then(() => revalidate())} />
                </>
              )}
              {group.Status === "PAUSED" && (
                <>
                  <Action title="Resume" onAction={() => resumeDownload(group.NZBID).then(() => revalidate())} />
                  <Action title="Cancel" onAction={() => cancelDownload(group.NZBID).then(() => revalidate())} />
                </>
              )}
            </ActionPanel>
          }
        />
      ))}
      {data?.result.length === 0 && <List.EmptyView title="No active downloads" icon={Icon.Download} />}
    </List>
  );
}
