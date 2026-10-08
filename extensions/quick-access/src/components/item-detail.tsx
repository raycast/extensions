import { List } from "@raycast/api";
import React from "react";
import { FileContentInfo } from "../types/file-content-info";

export function ItemDetail(props: { isDetailLoading: boolean; fileContentInfo: FileContentInfo }) {
  const { isDetailLoading, fileContentInfo } = props;

  return (
    <List.Item.Detail
      isLoading={isDetailLoading}
      markdown={fileContentInfo.fileContent}
      metadata={
        !isDetailLoading && (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={fileContentInfo.name} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Where" text={fileContentInfo.where} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title={fileContentInfo.sizeTitle} text={fileContentInfo.size} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Last opened" text={fileContentInfo.lastOpened} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Modified" text={fileContentInfo.modified} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Created" text={fileContentInfo.created} />
          </List.Item.Detail.Metadata>
        )
      }
    />
  );
}
