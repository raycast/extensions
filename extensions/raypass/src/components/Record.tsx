import type { FC } from "react";
import type { Record as RecordType, RevalidateRecords } from "../types";
import { ActionPanel, Icon, List, Image } from "@raycast/api";
import {
  CopyRecordPassword,
  CopyRecordTOTP,
  CopyRecordUsername,
  CopyRecordEmail,
  CopyRecordJSON,
  OpenRecordURL,
  NewRecordAction,
  EditRecordAction,
  DeleteRecordAction,
  ManageDocumentsAction,
  RefreshLocalReferencesActions,
  ExitRayPassAction,
  ShowDocument,
} from "../actions";

import totp from "totp-generator";

interface Props extends RecordType {
  revalidateRecords: RevalidateRecords;
}

export const Record: FC<Props> = ({ id, name, url, username, password, secret, email, notes, revalidateRecords }) => {
  const md = `
  ${url ? `## [${name}](${url})` : `## ${name}`}
  ${notes ? notes : ""}
  `;

  const getIcon = (): Image.Source => {
    if (url) return `https://icon.horse/icon/${new URL(url).hostname}`;
    return Icon.Key;
  };

  return (
    <List.Item
      icon={{ source: getIcon() }}
      title={name}
      detail={
        <List.Item.Detail
          markdown={md}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={`Record ${id}`} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Password" text={password} />
              {secret && <List.Item.Detail.Metadata.Label title="TOTP" text={totp(secret)} />}
              {username && <List.Item.Detail.Metadata.Label title="Username" text={username} />}
              {email && <List.Item.Detail.Metadata.Label title="Email" text={email} />}
              {url && <List.Item.Detail.Metadata.Label title="URL" text={url} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title={`Record ${id}`}>
            <CopyRecordPassword password={password} />
            {secret && <CopyRecordTOTP secret={secret} />}
            {username && <CopyRecordUsername username={username} />}
            {email && <CopyRecordEmail email={email} />}
            {url && <OpenRecordURL url={url} />}
            <CopyRecordJSON record={{ id, name, url, username, password, secret, email, notes }} />
            <EditRecordAction
              id={id}
              record={{ name, username, password, secret, email, notes, url }}
              revalidateRecords={revalidateRecords}
            />
            <DeleteRecordAction id={id} revalidateRecords={revalidateRecords} />
          </ActionPanel.Section>
          <ActionPanel.Section title="RayPass Actions">
            <NewRecordAction revalidateRecords={revalidateRecords} />
            <ManageDocumentsAction />
            <ShowDocument name={name} />
            <RefreshLocalReferencesActions />
            <ExitRayPassAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
