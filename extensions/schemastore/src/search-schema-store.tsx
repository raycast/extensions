import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type CatalogEntry = {
  name: string;
  description?: string;
  url: string;
  fileMatch?: string[];
};

type Catalog = { schemas: CatalogEntry[] };

const CATALOG_URL = "https://www.schemastore.org/api/json/catalog.json";

export default function Command() {
  const { data, isLoading, error } = useFetch<Catalog>(CATALOG_URL, {
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter schemas by name, description, or fileMatch…">
      {!isLoading && (
        <List.EmptyView
          icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
          title={error ? "Couldn't Load Schemas" : "No Schemas Found"}
          description={
            error ? "Check your internet connection and try again." : "Try a different name or file pattern."
          }
        />
      )}
      {data?.schemas.map((schema) => (
        <List.Item
          key={`${schema.name}::${schema.url}`}
          icon={Icon.Code}
          title={schema.name}
          subtitle={schema.description}
          keywords={[...(schema.fileMatch ?? []), ...(schema.description ? [schema.description] : [])]}
          accessories={schema.fileMatch?.slice(0, 2).map((pattern) => ({ tag: pattern }))}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Schema URL" content={schema.url} />
              <Action.OpenInBrowser url={schema.url} />
              <Action.Paste content={schema.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
