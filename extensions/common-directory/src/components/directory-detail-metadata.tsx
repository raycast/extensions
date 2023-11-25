import { List } from "@raycast/api";
import React from "react";
import { FileContentInfo } from "../types/file-content-info";

export function DirectoryDetailMetadata(props: { directoryInfo: FileContentInfo }) {
  const { directoryInfo } = props;
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Name" text={directoryInfo.name} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Where" text={directoryInfo.where} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title={directoryInfo.sizeTitle} text={directoryInfo.size} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Created" text={directoryInfo.created} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Modified" text={directoryInfo.modified} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Last opened" text={directoryInfo.lastOpened} />
    </List.Item.Detail.Metadata>
  );
}
