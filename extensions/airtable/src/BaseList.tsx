import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { AirtableBaseDetails } from "./BaseSchemaDetailsView";
import { AirtableBaseSchemaTableListView } from "./BaseSchemaListView";
import { incrementNumberOfClicksOnDetailForBaseAsync, NumberOfClicksByBase } from "./LocalStorageWrapper";
import { AirtableBaseMetadata } from "./types";

export function BaseList(props: {
  isLoading: boolean;
  bases: Array<AirtableBaseMetadata>;
  numberOfClicksByBaseId: NumberOfClicksByBase;
}) {
  const { isLoading, bases, numberOfClicksByBaseId } = props;
  return (
    <List
      navigationTitle={`${bases.length} bases`}
      searchBarPlaceholder="Type to filter your list of bases"
      isLoading={isLoading}
    >
      {bases
        .sort((baseA, baseB) => (numberOfClicksByBaseId[baseB.id] ?? 0) - (numberOfClicksByBaseId[baseA.id] ?? 0))
        .map((base) => {
          return <AirtableBaseListItem key={base.id} baseMetadata={base} />;
        })}
    </List>
  );
}

function AirtableBaseListItem(props: { baseMetadata: AirtableBaseMetadata }) {
  const { baseMetadata } = props;

  return (
    <List.Item
      id={baseMetadata.id}
      title={baseMetadata.title}
      // accessories={[{ icon: Icon.Binoculars, text: `${baseMetadata.permissionLevel} permission` }]}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.ArrowRight}
            title="Continue to list of tables"
            target={<AirtableBaseSchemaTableListView baseMetadata={baseMetadata} />}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onPush={() => incrementNumberOfClicksOnDetailForBaseAsync(baseMetadata.id)}
          />
          <Action.OpenInBrowser title="Open base in browser" url={baseMetadata.baseUrl} />
          <Action.Push
            icon={Icon.Sidebar}
            title="Details view: tables fields list"
            target={<AirtableBaseDetails baseMetadata={baseMetadata} />}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Action.OpenInBrowser title="Open API docs in browser" url={baseMetadata.apiDocsUrl} />
          <Action.CopyToClipboard
            title={`Copy base ID (${baseMetadata.id})`}
            content={baseMetadata.id}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
        </ActionPanel>
      }
    />
  );
}
