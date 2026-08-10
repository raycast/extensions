import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import type { NameAndScope } from "@/types";

import { jsrUrls } from "@/lib/jsrUrls";
import { formatRelative } from "@/lib/ui-helpers";

import { useDownloads, useVersions } from "@/hooks/jsrApi";

const VersionList = (props: NameAndScope) => {
  const { data, isLoading } = useVersions(props);
  const { data: downloadsData, isLoading: downloadsIsLoading } = useDownloads(props);

  const downloadsForVersion = (version: string): number | null => {
    const entry = downloadsData?.recentVersions.find((v) => v.version === version);
    if (!entry) return null;
    return entry.downloads.reduce((sum, d) => sum + d.count, 0);
  };

  return (
    <List isLoading={isLoading || downloadsIsLoading}>
      {data?.map((result) => {
        const downloads = downloadsForVersion(result.version);
        const accessories: List.Item.Accessory[] = [];
        if (downloads !== null) {
          accessories.push({
            tag: { value: downloads.toLocaleString(), color: Color.Green },
            icon: { source: Icon.Download },
            tooltip: "Downloads (90d)",
          });
        }
        accessories.push({
          tag: { value: formatRelative(result.updatedAt), color: Color.Blue },
          tooltip: `Last updated: ${new Date(result.updatedAt).toLocaleString()}`,
        });
        return (
          <List.Item
            key={`${result.scope}/${result.package}/${result.version}`}
            title={result.version}
            accessories={accessories}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Open">
                  <Action.OpenInBrowser
                    title="Open Specific Version (JSR)"
                    icon={{ source: "jsr.svg" }}
                    url={jsrUrls.site.scopePackageVersion(result.scope, result.package, result.version)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Import Command">
                  <Action.CopyToClipboard
                    title="ESM.sh (Deno)"
                    content={`import {  } from "https://esm.sh/jsr/@${result.scope}/${result.package}@${result.version}"`}
                    icon={{ source: "deno.svg" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
      <List.EmptyView
        title={"No results found"}
        description={"Try another search query"}
        icon={{ source: "jsr.svg" }}
      />
    </List>
  );
};

export default VersionList;
