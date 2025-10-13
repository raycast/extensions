import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { AirtableBaseDetails } from "./BaseSchemaDetailsView";
import { AirtableBaseSchemaTableListView } from "./BaseSchemaListView";
import { incrementNumberOfClicksOnDetailForBaseAsync, NumberOfClicksByBase } from "./LocalStorageWrapper";
import { AirtableBaseMetadata } from "./types";
import { Fragment } from "react";
import { getAvatarIcon } from "@raycast/utils";

export function BaseList(props: {
  isLoading: boolean;
  bases: Array<AirtableBaseMetadata>;
  numberOfClicksByBaseId: NumberOfClicksByBase;
}) {
  const { isLoading, bases, numberOfClicksByBaseId } = props;
  return (
    <List searchBarPlaceholder="Type to filter your list of bases..." isLoading={isLoading}>
      <List.EmptyView title="No Bases Found" icon="no-view.png" />
      {bases && (
        <Fragment key="header">
          <List.Section key={"list.section"} title={`${bases.length} base${bases.length > 1 ? "s" : ""} found`}>
            {bases
              .sort((baseA, baseB) => (numberOfClicksByBaseId[baseB.id] ?? 0) - (numberOfClicksByBaseId[baseA.id] ?? 0))
              .map((base) => {
                return <AirtableBaseListItem key={base.id} baseMetadata={base} />;
              })}
          </List.Section>
        </Fragment>
      )}
    </List>
  );
}

function AirtableBaseListItem(props: { baseMetadata: AirtableBaseMetadata }) {
  const { baseMetadata } = props;

  return (
    <List.Item
      id={baseMetadata.id}
      icon={getAvatarIcon(baseMetadata.title)}
      title={baseMetadata.title}
      // accessories={[{ icon: Icon.Binoculars, text: `${baseMetadata.permissionLevel} permission` }]}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.ArrowRight}
            title="Continue to List of Tables"
            target={<AirtableBaseSchemaTableListView baseMetadata={baseMetadata} />}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onPush={() => incrementNumberOfClicksOnDetailForBaseAsync(baseMetadata.id)}
          />
          <Action.OpenInBrowser title="Open Base in Browser" url={baseMetadata.baseUrl} />
          <Action.Push
            icon={Icon.Sidebar}
            title="Details View: Tables Fields List"
            target={<AirtableBaseDetails baseMetadata={baseMetadata} />}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          {/* eslint-disable-next-line @raycast/prefer-title-case */}
          <Action.OpenInBrowser title="Open API Docs in Browser" url={baseMetadata.apiDocsUrl} />
          <Action.CopyToClipboard
            title={`Copy Base ID (${baseMetadata.id})`}
            content={baseMetadata.id}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
        </ActionPanel>
      }
    />
  );
}
