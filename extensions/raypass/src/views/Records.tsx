import type { FC } from "react";
import { List, ActionPanel, Color, Icon } from "@raycast/api";
import { useRecords } from "../hooks";
import {
  NewRecordAction,
  ManageDocumentsAction,
  RefreshLocalReferencesActions,
  ShowDocument,
  ExitRayPassAction,
} from "../actions";
import { Record, NoRecords } from "../components";

export const Records: FC = () => {
  const { data, isLoading, revalidate } = useRecords();

  const mdCodeTags = {
    document: "`Document`",
    Record: "`Password Record`",
    code: "```ts\ninterface Record {\n  name: string;\n  username?: string;\n  email?: string;\n  password: string;\n  url?: string;\n  notes?: string;\n}\n```",
  };

  const md = `
  # RayPass Reference
  
  ${mdCodeTags.document} - A document is a collection of password records stored on your disk in JSON format and encrypted with your master password. You can have multiple documents, each with its own master password and unique set of records.
  
  ${mdCodeTags.Record} - A JSON object entry in your document that follows the following format:
  
  ${mdCodeTags.code}`;

  if (!data) return <List isLoading={true} />;

  const { document, records } = data;

  const showEmptyState = records.length === 0;

  return (
    <List
      isShowingDetail={!showEmptyState}
      isLoading={isLoading}
      navigationTitle={`RayPass - ${document.name}`}
      searchBarPlaceholder="Search Records"
    >
      {showEmptyState ? (
        <NoRecords documentName={document?.name} revalidateRecords={revalidate} />
      ) : (
        <>
          <List.Section title="RayPass Reference">
            <List.Item
              title="RayPass Actions"
              icon={{ source: Icon.Compass, tintColor: Color.Blue }}
              actions={
                <ActionPanel title="RayPass Actions">
                  <NewRecordAction revalidateRecords={revalidate} />
                  <ManageDocumentsAction />
                  <ShowDocument name={document.name} />
                  <RefreshLocalReferencesActions />
                  <ExitRayPassAction />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  markdown={md}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Commands" />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Records" />
                      <List.Item.Detail.Metadata.Label title="Copy Password" text="⌘P or Enter" />
                      <List.Item.Detail.Metadata.Label title="Copy Username" text="⌘U" />
                      <List.Item.Detail.Metadata.Label title="Copy Email" text="⌘E" />
                      <List.Item.Detail.Metadata.Label title="Copy Record (JSON)" text="⌘J" />
                      <List.Item.Detail.Metadata.Label title="Open URL" text="⌘⇧W" />
                      <List.Item.Detail.Metadata.Label title="Create New Record" text="⌘N" />
                      <List.Item.Detail.Metadata.Label title="Edit Record" text="⌘⇧E" />
                      <List.Item.Detail.Metadata.Label title="Delete Record" text="⌘Backspace" />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Documents" />
                      <List.Item.Detail.Metadata.Label title="Manage/Switch Documents" text="⌘O" />
                      <List.Item.Detail.Metadata.Label title="New Document (Must be managing docs)" text="⌘⇧D" />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="General" />
                      <List.Item.Detail.Metadata.Label title="Refresh Local References" text="⌘⇧R" />
                      <List.Item.Detail.Metadata.Label title="Exit RayPass" text="⌘ESC" />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          </List.Section>
          <List.Section title={`Records (${records.length})`}>
            {records.map((record, index) => (
              <Record key={index} {...record} revalidateRecords={revalidate} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
};
