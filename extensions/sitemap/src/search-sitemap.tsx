import { Action, ActionPanel, Detail, Icon, List, type LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { searchSitemap } from "./search-sitemap-data";
import { getSitemapEntryAccessories, getSitemapEntryTitle } from "./sitemap-view";

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchSitemap }>) {
  const { isLoading, data: entries, error, revalidate } = usePromise(searchSitemap, [props.arguments.url]);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error.message}`}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.RotateClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
    );
  }

  if (entries === undefined) {
    return <List isLoading={true} searchBarPlaceholder="Search pages..." />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search pages...">
      {entries.length === 0 ? <List.EmptyView title="This sitemap contains no pages" /> : null}
      {entries.map((entry) => (
        <List.Item
          key={entry.url}
          id={entry.url}
          title={getSitemapEntryTitle(entry.url)}
          subtitle={entry.url}
          accessories={getSitemapEntryAccessories(entry)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={entry.url} title="Open Page" />
              <Action.CopyToClipboard title="Copy URL" content={entry.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
