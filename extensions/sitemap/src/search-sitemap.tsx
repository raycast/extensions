import { Action, ActionPanel, Detail, Icon, List, type LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getUrlOrCurrentTab } from "./get-url-or-current-tab";
import { discoverSitemapUrl, loadSitemapPages, type Page } from "./parse-sitemap";

function lastSegment(url: string): string {
  const pathname = new URL(url).pathname;
  const trimmed = pathname.replace(/\/$/, "");
  const parts = trimmed.split("/");
  const segment = parts[parts.length - 1];
  return segment && segment.length > 0 ? segment : url;
}

function formatDate(lastModified: string): string {
  const date = new Date(lastModified);
  if (Number.isNaN(date.getTime())) {
    return lastModified;
  }

  return date.toISOString().split("T")[0] ?? lastModified;
}

function pageAccessories(page: Page) {
  const accessories: { text: string }[] = [];
  if (page.lastModified) {
    accessories.push({ text: formatDate(page.lastModified) });
  }
  accessories.push({ text: page.changefreq ?? "—" });
  accessories.push({ text: page.priority ?? "—" });
  return accessories;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchSitemap }>) {
  const {
    isLoading,
    data: pages,
    error,
    revalidate,
  } = usePromise(async () => {
    const source = await getUrlOrCurrentTab(props.arguments.url);
    if (source.kind === "missing") {
      throw new Error(source.reason);
    }

    const sitemapUrl = await discoverSitemapUrl(source.url);
    return loadSitemapPages(sitemapUrl);
  }, []);

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

  if (pages === undefined) {
    return <List isLoading={true} searchBarPlaceholder="Search pages..." />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search pages...">
      {pages.map((page) => (
        <List.Item
          key={page.url}
          id={page.url}
          title={lastSegment(page.url)}
          subtitle={page.url}
          accessories={pageAccessories(page)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={page.url} title="Open Page" />
              <Action.CopyToClipboard title="Copy URL" content={page.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
