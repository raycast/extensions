import { Action, ActionPanel, environment, Icon, Keyboard, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { Doc } from "./types";
import { SearchEntries } from "./search-entries";

export default function SearchDocsets(): JSX.Element {
  const { data, isLoading } = useFetch<Doc[]>(`https://devdocs.io/docs/docs.json`, {});
  const defaultSlugs = ["css", "html", "http", "javascript", "dom"];
  const preferredDocumentations = data?.filter((documentation) => defaultSlugs.includes(documentation.slug));

  return (
    <List isLoading={isLoading}>
      <List.Section title="Preferred">
        {preferredDocumentations?.map((doc) => <DocItem key={doc.slug} doc={doc} />)}
      </List.Section>
      <List.Section title="Available">{data?.map((doc) => <DocItem key={doc.slug} doc={doc} />)}</List.Section>
    </List>
  );
}

function DocItem({ doc }: { doc: Doc }): JSX.Element {
  const quicklink = {
    link: `raycast://extensions/${environment.ownerOrAuthorName}/${
      environment.extensionName
    }/search-entries?arguments=${encodeURIComponent(JSON.stringify({ slug: doc.slug }))}`,
    name: doc.version ? `Search DevDocs ${doc.name} ${doc.version} Entries` : `Search DevDocs ${doc.name} Entries`,
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
            <Action.CreateQuicklink
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              quicklink={quicklink}
            />
            <Action.CopyToClipboard content={doc.slug} shortcut={Keyboard.Shortcut.Common.CopyName} />
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
