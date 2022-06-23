import { Action, ActionPanel, List } from "@raycast/api";
import React from "react";
import { getShortLinks } from "./hooks/hooks";
import { isEmpty } from "./utils/common-utils";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { ActionGoShortIo } from "./components/action-go-short-io";
import { ListEmptyView } from "./components/list-empty-view";

export default function ShortenLinkWithDomain() {
  const { shortLinks, loading } = getShortLinks();
  return (
    <List isLoading={loading} isShowingDetail={shortLinks.length !== 0 && true} searchBarPlaceholder={"Search links"}>
      <ListEmptyView title={"No Link"} icon={"empty-link-icon.svg"} />
      {shortLinks.map((value, index) => {
        return (
          <List.Item
            key={index}
            icon={"link-icon.svg"}
            title={value.shortURL}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    {!isEmpty(value.title) && (
                      <>
                        <List.Item.Detail.Metadata.Label title={"Title"} text={value.title + ""} />
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}
                    <List.Item.Detail.Metadata.Label title={"Short Link"} text={value.shortURL} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={"Original Link"} text={value.originalURL} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={"Source"} text={value.source} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title={"Created At"}
                      text={value.createdAt.substring(0, 19).replace("T", " ")}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title={"Updated At"}
                      text={value.updatedAt.substring(0, 19).replace("T", " ")}
                    />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={"Copy Link"} content={value.shortURL} />
                <Action.OpenInBrowser title={"Open Link"} url={value.shortURL} />
                <ActionGoShortIo />
                <ActionOpenPreferences />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
