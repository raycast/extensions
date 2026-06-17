import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { useDocuments } from "./hooks/useDocuments";
import { DetailsView } from "./components/DetailsView";
import { DOCS_URL } from "./config";
import { useState } from "react";

export default function Artisan() {
  const { documents, isLoading } = useDocuments();
  const [search, setSearch] = useState<string>("");

  const unsorted = documents?.filter(
    (doc) =>
      !search ||
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.text.toLowerCase().includes(search.toLowerCase())
  );
  const filteredDocuments = search
    ? unsorted?.sort((a) => {
        // Sort by title results first
        return a.title.toLowerCase().includes(search.toLowerCase()) ? -1 : 1;
      })
    : unsorted;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearch}
      navigationTitle="Search WebKit Developer Documentation"
      isShowingDetail
      searchBarPlaceholder="Search documents..."
    >
      {filteredDocuments?.map((doc) => (
        <List.Item
          // Unescape some HTML entities
          title={doc.title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")}
          key={doc.title + doc.location}
          icon={{
            source: Icon.Paragraph,
            tintColor: { light: "#00253d", dark: "#ffffff" },
          }}
          detail={<DetailsView doc={doc} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Browser" url={DOCS_URL + doc.location} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
