import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { Doc } from "./types";
import { SearchEntries } from "./search-entries";

export default function SearchDocsets(): JSX.Element {
  const { data, isLoading } = useFetch<Doc[]>(`https://devdocs.io/docs/docs.json`, {});

  return (
    <List isLoading={isLoading}>
      {data?.map((doc) => (
        <DocItem key={doc.slug} doc={doc} />
      ))}
    </List>
  );
}

function DocItem({ doc }: { doc: Doc }): JSX.Element {
  const quicklink = {
    link: `raycast://extensions/pomdtr/devdocs/search-entries?arguments=${encodeURIComponent(
      JSON.stringify({ slug: doc.slug })
    )}`,
    name: doc.version ? `Search ${doc.name} ${doc.version} Entries` : `Search ${doc.name} Entries`,
  };
  return (
    <List.Item
      title={doc.name}
      icon={doc.links?.home ? getFavicon(doc.links.home) : Icon.Book}
      subtitle={doc.version}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.MagnifyingGlass}
              title="Search Entries"
              target={<SearchEntries slug={doc.slug} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CreateQuicklink icon={Icon.Link} quicklink={quicklink} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {doc.links?.home && (
              <Action.OpenInBrowser icon={Icon.Globe} title="Open Project Home" url={doc.links.home} />
            )}
            {doc.links?.code && (
              <Action.OpenInBrowser icon={Icon.Globe} title="Open Project Repository" url={doc.links.code} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
