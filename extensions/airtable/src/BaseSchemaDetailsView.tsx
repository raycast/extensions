import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { AirtableBaseMetadata, Table } from "./types";
import * as api from "./metadata-api";

export function AirtableBaseDetails(props: { baseMetadata: AirtableBaseMetadata }) {
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
        if (fetchedBaseSchema.tables) {
          setTables(fetchedBaseSchema.tables);
          setIsLoading(false);
        } else {
          throw new Error("No tables found in base");
        }
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

  return AirtableBaseDetailsView(isLoading, baseMetadata, tables);
}

function AirtableBaseDetailsView(isLoading: boolean, baseMetadata: AirtableBaseMetadata, tables: Table[]) {
  let markdown = `## ${baseMetadata.title}\n\n`;
  tables.forEach((table) => {
    markdown += `### [${table.name}](${baseMetadata.baseUrl}/${table.id}) \`${table.id}\`\n`;
    markdown += `${table.description || "_No description_"}`;
    markdown += `\n\nFields:\n`;
    table.fields.forEach((field) => {
      markdown += `  - ${field.name} \`${field.type}\` \`${field.id}\`\n`;
      if (field.description) {
        markdown += `    Description: ${field.description}\n`;
      }
    });
  });

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label icon={Icon.MagnifyingGlass} title="Base ID" text={baseMetadata.id} />
          <Detail.Metadata.Label icon={Icon.Binoculars} title="Permission level" text={baseMetadata.permissionLevel} />
          <Detail.Metadata.Label icon={Icon.List} title="# of tables" text={tables.length.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Base UI" target={baseMetadata.baseUrl} text="Open in browser" />
          <Detail.Metadata.Link title="API docs" target={baseMetadata.apiDocsUrl} text="Open in browser" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Base in Browser" url={`${baseMetadata.baseUrl}`} />
          {/* eslint-disable-next-line @raycast/prefer-title-case */}
          <Action.OpenInBrowser title="Open Base API Docs in Browser" url={baseMetadata.apiDocsUrl} />
          <Action.CopyToClipboard title={`Copy Base ID (${baseMetadata.id})`} content={baseMetadata.id} />
        </ActionPanel>
      }
    />
  );
}
