import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import React, { useMemo } from "react";
import { formatISODate, isEmpty } from "./utils/common-utils";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { ActionGoShortIo } from "./components/action-go-short-io";
import { ListEmptyView } from "./components/list-empty-view";
import { deleteShortLink } from "./utils/axios-utils";
import EditLink from "./edit-link";
import { alertDialog } from "./components/alert-dialog";
import { useShortLinks } from "./hooks/useShortLinks";
import Style = Toast.Style;

export default function SearchLinks() {
  const { data, isLoading, mutate } = useShortLinks();
  const shortLinks = useMemo(() => {
    return data || [];
  }, [data]);

  return (
    <List isLoading={isLoading} isShowingDetail={shortLinks.length !== 0 && true} searchBarPlaceholder={"Search links"}>
      <ListEmptyView
        title={"No Link"}
        icon={{ source: { light: "empty-link-icon.svg", dark: "empty-link-icon@dark.svg" } }}
      />
      {shortLinks.map((value, index) => {
        return (
          <List.Item
            key={index}
            icon={{ source: { light: "link-icon.svg", dark: "link-icon@dark.svg" } }}
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
                    <List.Item.Detail.Metadata.Label title={"Created At"} text={formatISODate(value.createdAt)} />
                    <List.Item.Detail.Metadata.Separator />
                    {value.updatedAt && (
                      <>
                        <List.Item.Detail.Metadata.Label title={"Updated At"} text={formatISODate(value.updatedAt)} />
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={"Copy Link"} content={value.shortURL} />
                <Action.OpenInBrowser title={"Open Link"} url={value.shortURL} />
                <ActionPanel.Section>
                  <Action.Push
                    icon={Icon.Pencil}
                    title={"Edit Link"}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<EditLink shortLink={value} mutate={mutate} />}
                  />
                  <Action
                    icon={Icon.Trash}
                    title={"Delete Link"}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      await alertDialog(
                        Icon.Trash,
                        "Delete Link",
                        `Are you sure you want to delete ${value.shortURL}?`,
                        "Delete",
                        async () => {
                          await showToast(Style.Animated, "Deleting...");
                          const deleteResult = await deleteShortLink(value.idString);
                          if (deleteResult.success) {
                            const _shortLinks = [...shortLinks];
                            _shortLinks.splice(index, 1);
                            await mutate();
                            await showToast(Style.Success, "Success.", "Link deleted successfully");
                          } else {
                            await showToast(Style.Failure, "Error.", deleteResult.message);
                          }
                        },
                      );
                    }}
                  />
                </ActionPanel.Section>
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
