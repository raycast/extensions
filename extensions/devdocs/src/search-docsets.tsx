import { Action, ActionPanel, environment, Icon, Keyboard, List } from "@raycast/api";
import { useFetch, useLocalStorage } from "@raycast/utils";
import { Doc } from "./types";
import { SearchEntries } from "./search-entries";
import { useEffect, useState } from "react";

export default function SearchDocsets(): JSX.Element {
  const { data, isLoading } = useFetch<Doc[]>(`https://devdocs.io/docs/docs.json`, {});
  const defaultDocs = { docs: ["css", "html", "http", "javascript", "dom"].join("/") };
  const { value: docSlugsStorage } = useLocalStorage("docs", JSON.stringify(defaultDocs));
  const [searchText, setSearchText] = useState("");

  const [documentations, setDocumentations] = useState<[Doc[], Doc[]]>([[], []]);
  const [filteredDocs, filterDocs] = useState(documentations);

  useEffect(() => {
    const docSlugsObject = JSON.parse(docSlugsStorage || "{}");
    const docSlugs = docSlugsObject["docs"] ? Array.from(docSlugsObject["docs"]?.split("/")) : [];
    if (data && docSlugsObject) {
      const preferredDocs: Doc[] = [];
      const availableDocs: Doc[] = [];

      data.forEach((doc) => {
        if (docSlugs?.find((preferredDoc) => preferredDoc === doc.slug)) {
          preferredDocs.push(doc);
        } else {
          availableDocs.push(doc);
        }
      });

      setDocumentations([preferredDocs, availableDocs]);
    }
  }, [isLoading]);

  useEffect(() => {
    filterDocs([
      // return exact match if alias is used
      documentations[0].filter((item) => item.alias && item.alias === searchText.toLowerCase()),
      documentations[1].filter((item) => item.alias && item.alias === searchText.toLowerCase()),
    ]);
  }, [searchText, documentations]);

  return (
    <List isLoading={isLoading} filtering={true} onSearchTextChange={setSearchText}>
      {((filteredDocs[0].length > 0 || filteredDocs[1].length) > 0 && DocumentationSection(filteredDocs)) ||
        (documentations[0].length > 0 && documentations[1].length && DocumentationSection(documentations))}
    </List>
  );
}

function DocumentationSection(docs: [Doc[], Doc[]]): JSX.Element {
  return (
    <>
      <List.Section title="Preferred">{docs[0]?.map((doc) => <DocItem key={doc.slug} doc={doc} />)}</List.Section>
      <List.Section title="Available">{docs[1]?.map((doc) => <DocItem key={doc.slug} doc={doc} />)}</List.Section>
    </>
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
      icon={{
        source: `https://github.com/freeCodeCamp/devdocs/blob/main/public/icons/docs/${doc.slug.split("~")[0]}/16@2x.png?raw=true`,
        fallback: Icon.Book,
      }}
      subtitle={doc.version}
      keywords={doc.alias ? [doc.alias] : undefined}
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
