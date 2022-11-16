import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { AirtableBaseMetadata, Field, Table, View } from "./types";
import * as api from "./metadata-api";

export function AirtableBaseSchemaTableListView(props: { baseMetadata: AirtableBaseMetadata }) {
  const { baseMetadata } = props;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tables, setTables] = useState<Table[]>(() => {
    const cachedBaseSchema = api.getCachedBaseSchemaIfExists(baseMetadata.id);
    return cachedBaseSchema ? cachedBaseSchema.tables : [];
  });

  useEffect(() => {
    (async () => {
      try {
        const fetchedBaseSchema = await api.fetchBaseSchema(baseMetadata.id);
        setTables(fetchedBaseSchema.tables);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, [baseMetadata.id]);

  if (isLoading && tables.length === 0) {
    return <Detail isLoading={isLoading} />;
  }

  return AirtableTableList(isLoading, baseMetadata, tables);
}

function AirtableTableList(isLoading: boolean, baseMetadata: AirtableBaseMetadata, tables: Table[]) {
  return (
    <List
      navigationTitle={`${tables.length} tables`}
      searchBarPlaceholder={`Type to filter tables in '${baseMetadata.title}'`}
      isLoading={isLoading}
    >
      {tables.map((table) => {
        return <AirtableTableListItem key={table.id} baseMetadata={baseMetadata} table={table} />;
      })}
    </List>
  );
}

function AirtableTableListItem(props: { baseMetadata: AirtableBaseMetadata; table: Table }) {
  const { baseMetadata, table } = props;

  return (
    <List.Item
      key={table.id}
      title={table.name}
      subtitle={table.description ? table.description : undefined}
      accessories={[
        { icon: Icon.TextCursor, text: `${table.fields.length} fields` },
        { icon: Icon.AppWindowGrid3x3, text: `${table.views.length} views` },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open table in browser" url={`${baseMetadata.baseUrl}/${table.id}`} />
          <Action.Push
            title="Continue to views list"
            icon={Icon.AppWindowGrid3x3}
            target={<AirtableBaseSchemaViewsList baseMetadata={baseMetadata} tableId={table.id} views={table.views} />}
          />
          <Action.Push
            title="Continue to fields list"
            icon={Icon.TextCursor}
            target={
              <AirtableBaseSchemaFieldsList baseMetadata={baseMetadata} tableId={table.id} fields={table.fields} />
            }
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.CopyToClipboard title={`Copy table ID (${table.id})`} content={table.id} />
        </ActionPanel>
      }
    />
  );
}

export function AirtableBaseSchemaFieldsList(props: {
  baseMetadata: AirtableBaseMetadata;
  tableId: string;
  fields: Field[];
}) {
  const { baseMetadata, tableId, fields } = props;

  return (
    <List
      navigationTitle={`${fields.length} fields`}
      searchBarPlaceholder={`Type to filter fields in '${baseMetadata.title}'`}
    >
      {fields.map((field) => {
        return (
          <List.Item
            key={field.id}
            title={field.name}
            subtitle={field.description ? field.description : undefined}
            accessories={[{ text: `${field.type}` }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open table in browser" url={`${baseMetadata.baseUrl}/${tableId}`} />
                <Action.CopyToClipboard title={`Copy field ID (${field.id})`} content={field.id} />
                <Action.CopyToClipboard title={`Copy field type (${field.type})`} content={field.type} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export function AirtableBaseSchemaViewsList(props: {
  baseMetadata: AirtableBaseMetadata;
  tableId: string;
  views: View[];
}) {
  const { baseMetadata, tableId, views } = props;

  return (
    <List
      navigationTitle={`${views.length} views`}
      searchBarPlaceholder={`Type to filter views in '${baseMetadata.title}'`}
    >
      {views.map((view) => {
        return (
          <List.Item
            key={view.id}
            title={view.name}
            subtitle={view.type}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open view in browser"
                  url={`${baseMetadata.baseUrl}/${tableId}/${view.id}`}
                />
                <Action.CopyToClipboard title={`Copy view ID (${view.id})`} content={view.id} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
