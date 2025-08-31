import { Action, ActionPanel, Detail, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { AirtableBaseMetadata, Field, Table, View } from "./types";
import * as api from "./metadata-api";
import { Fragment } from "react";
import { AirtableBaseRecordsList } from "./BaseRecordsList";

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
      navigationTitle={`List Tables: ${baseMetadata.title}`}
      searchBarPlaceholder={`Type to filter tables in '${baseMetadata.title}'`}
      isLoading={isLoading}
    >
      <List.EmptyView title="No Tables Found" icon="no-view.png" />
      {tables && (
        <Fragment key="header">
          <List.Section key={"list.section"} title={`${tables.length} table${tables.length > 1 ? "s" : ""} found`}>
            {tables.map((table) => {
              return <AirtableTableListItem key={table.id} baseMetadata={baseMetadata} table={table} />;
            })}
          </List.Section>
        </Fragment>
      )}
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
          <Action.OpenInBrowser title="Open Table in Browser" url={`${baseMetadata.baseUrl}/${table.id}`} />
          <Action.Push
            title="Continue to Views List"
            icon={Icon.AppWindowGrid3x3}
            target={<AirtableBaseSchemaViewsList baseMetadata={baseMetadata} tableId={table.id} views={table.views} />}
          />
          <Action.Push
            title="Continue to Fields List"
            icon={Icon.TextCursor}
            target={
              <AirtableBaseSchemaFieldsList baseMetadata={baseMetadata} tableId={table.id} fields={table.fields} />
            }
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.Push
            title="Continue to Records"
            icon={Icon.List}
            target={<AirtableBaseRecordsList baseId={baseMetadata.id} tableId={table.id} fields={table.fields} />}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
          />
          <Action.CopyToClipboard title={`Copy Table ID (${table.id})`} content={table.id} />
        </ActionPanel>
      }
    />
  );
}

const FIELD_TYPE_ICONS: Record<string, Image.ImageLike> = {
  checkbox: Icon.CheckCircle,
  createdTime: Icon.Clock,
  date: {source:Icon.Calendar, mask: Image.Mask.Circle},
  dateTime: Icon.Calendar,
  email: Icon.AtSymbol,
  formula: Icon.Code,
  multilineText: Icon.Paragraph,
  multipleAttachments: Icon.Paperclip,
  multipleRecordLinks: Icon.ArrowNe,
  multipleSelects: Icon.Tag,
  number: Icon.NumberList,
  singleLineText: Icon.ShortParagraph,
  singleSelect: Icon.Circle,
  url: Icon.Link,
}

export function AirtableBaseSchemaFieldsList(props: {
  baseMetadata: AirtableBaseMetadata;
  tableId: string;
  fields: Field[];
}) {
  const { baseMetadata, tableId, fields } = props;


  return (
    <List
      navigationTitle={`Fields List: ${baseMetadata.title}`}
      searchBarPlaceholder={`Type to filter fields in '${baseMetadata.title}'`}
    >
      <List.EmptyView title="No Fields Found" icon="no-view.png" />
      {fields && (
        <Fragment key="header">
          <List.Section key={"list.section"} title={`${fields.length} field${fields.length > 1 ? "s" : ""} found`}>
            {fields.map((field) => {
              return (
                <List.Item
                  key={field.id}
                  icon={FIELD_TYPE_ICONS[field.type] || Icon.QuestionMark}
                  title={field.name}
                  subtitle={field.description ? field.description : undefined}
                  accessories={[{ text: `${field.type}` }]}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title="Open Table in Browser" url={`${baseMetadata.baseUrl}/${tableId}`} />
                      <Action.CopyToClipboard title={`Copy Field ID (${field.id})`} content={field.id} />
                      <Action.CopyToClipboard title={`Copy Field Type (${field.type})`} content={field.type} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </Fragment>
      )}
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
      navigationTitle={`Views List: ${baseMetadata.title}`}
      searchBarPlaceholder={`Type to filter views in '${baseMetadata.title}'`}
    >
      <List.EmptyView title="No Views Found" icon="no-view.png" />
      {views && (
        <Fragment key="header">
          <List.Section key={"list.section"} title={`${views.length} view${views.length > 1 ? "s" : ""} found`}>
            {views.map((view) => {
              return (
                <List.Item
                  key={view.id}
                  title={view.name}
                  subtitle={view.type}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        title="Open View in Browser"
                        url={`${baseMetadata.baseUrl}/${tableId}/${view.id}`}
                      />
                      <Action.CopyToClipboard title={`Copy View ID (${view.id})`} content={view.id} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </Fragment>
      )}
    </List>
  );
}
