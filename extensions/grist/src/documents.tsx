import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { WorkspaceWithDocsAndDomain, Doc } from "grist-js";
import { grist } from "./grist";
import OpenInGrist from "./open-in-grist";

export default function Documents({ workspace }: { workspace: WorkspaceWithDocsAndDomain }) {
  return (
    <List navigationTitle={`... / Workspaces / ${workspace.name} / Documents`}>
      {!workspace.docs.length ? (
        <List.EmptyView icon="create-document.svg" title="No documents to show" />
      ) : (
        workspace.docs.map((doc) => (
          <List.Item
            key={doc.id}
            icon={Icon.Document}
            title={doc.name}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.AppWindowList} title="Tables" target={<Tables doc={doc} />} />
                <OpenInGrist route={`${doc.id}/${doc.name}`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

const buildFieldsMarkdown = (fields: { [key: string]: unknown }) => {
  return `
| - | - |
|---|---|
${Object.entries(fields)
  .map(([key, val]) => `| ${key} | ${val} |`)
  .join(`\n`)}`;
};
function Tables({ doc }: { doc: Doc }) {
  const { isLoading, data: tables } = useCachedPromise(
    async (docId: string) => {
      const res = await grist.listTables({
        docId,
      });
      return res.tables;
    },
    [doc.id],
    { initialData: [] },
  );
  return (
    <List isLoading={isLoading} navigationTitle={`... / Documents / ${doc.name} / Tables`} isShowingDetail>
      {tables.map((table, tableIndex) => (
        <List.Item
          key={table.id}
          icon={Icon.AppWindowList}
          title={table.id}
          detail={<List.Item.Detail markdown={buildFieldsMarkdown(table.fields)} />}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Text} title="Records" target={<Records doc={doc} table={table} />} />
              <OpenInGrist route={`${doc.id}/${doc.name}/p/${tableIndex}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Records({
  doc,
  table,
}: {
  doc: Doc;
  table: {
    id: string;
    fields: {
      [key: string]: unknown;
    };
  };
}) {
  const { isLoading, data: records } = useCachedPromise(
    async (docId: string, tableId: string) => {
      const res = await grist.listRecords({ docId, tableId });
      return res.records;
    },
    [doc.id, table.id],
    { initialData: [] },
  );
  return (
    <List isLoading={isLoading} navigationTitle={`... / Tables / ${table.id} / Records`} isShowingDetail>
      {records.map((record) => (
        <List.Item
          key={record.id}
          icon={Icon.Text}
          title={record.id.toString()}
          detail={<List.Item.Detail markdown={buildFieldsMarkdown(record.fields)} />}
        />
      ))}
    </List>
  );
}
