/* eslint-disable @raycast/prefer-title-case */
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";

import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import type { NameAndScope } from "@/types";

import { useVersions } from "@/hooks/useJSRAPI";

export const VersionList = (props: NameAndScope) => {
  const { error, data, isLoading } = useVersions(props);

  useEffect(() => {
    if (error) {
      console.error("Failed to fetch JSR version data", error);
      showFailureToast({
        title: "Error fetching JSR version data",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List isLoading={isLoading}>
      {data?.map((result) => (
        <List.Item
          key={`${result.scope}/${result.package}/${result.version}`}
          title={result.version}
          accessories={[
            {
              tag: { value: `${result.lifetimeDownloadCount}`, color: Color.Green },
              icon: { source: Icon.Download },
            },
            {
              tag: { value: formatDistanceToNow(new Date(result.updatedAt), { addSuffix: true }), color: Color.Blue },
              tooltip: `Last updated: ${new Date(result.updatedAt).toLocaleString()}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Specific Version (JSR)"
                icon={{ source: "jsr.svg" }}
                url={`https://jsr.io/@${result.scope}/${result.package}@${result.version}`}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        title={"No results found"}
        description={"Try another search query"}
        icon={{ source: "jsr.svg" }}
      />
    </List>
  );
};
