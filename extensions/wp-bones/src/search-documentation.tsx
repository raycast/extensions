import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useStreamJSON } from "@raycast/utils";
import { useEffect, useState } from "react";

type DocumentationEntry = { path: string; title: string; data: { [key: string]: string } };
type Data = DocumentationEntry[] | { error: string };

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [url, setUrl] = useState("https://wpbones.com/api/search");

  const { data, error, isLoading, pagination } = useStreamJSON<Data>(url, {
    initialData: [],
    pageSize: 100,
  });

  useEffect(() => {
    setUrl(`https://wpbones.com/api/search?keyword=${searchText}`);
  }, [searchText]);

  if (error || (data && "error" in data)) {
    return (
      <List>
        <List.Item title="Error fetching data" />
      </List>
    );
  }

  // Check if data is an array (successful fetch)
  const documentationEntries = Array.isArray(data) ? data : [];

  return (
    <List isLoading={isLoading} pagination={pagination} onSearchTextChange={setSearchText}>
      <List.Section title="WP Bones Documentation">
        {documentationEntries.map((d) =>
          "path" in d ? (
            <List.Item
              actions={
                <ActionPanel title={d.title}>
                  <Action.OpenInBrowser url={`https://wpbones.com/${d.path}`} />
                  <Action.Push
                    icon={Icon.Eye}
                    title="Show Excerpt"
                    target={<Detail markdown={Object.values(d.data).join("\n\n")} />}
                  />
                </ActionPanel>
              }
              key={d.path}
              icon={Icon.Book}
              title={d.title}
              subtitle={Object.values(d.data)[0]}
            />
          ) : null,
        )}
      </List.Section>
    </List>
  );
}
