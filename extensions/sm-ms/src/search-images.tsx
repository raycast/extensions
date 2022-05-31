import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import React from "react";
import { getUploadHistory } from "./hooks/hooks";
import { ListEmptyView } from "./components/list-empty-view";
import { UploadHistoryDetail } from "./components/upload-history-detail";
import { alertDialog } from "./components/dialog";
import { deleteImageByHash } from "./utils/axios-utils";
import Style = Toast.Style;
import { ActionOpenExtensionPreferences } from "./components/action-open-extension-preferences";
import { ActionToSmMs } from "./components/action-to-sm-ms";
import { downloadAndCopyImage, downloadImage } from "./utils/common-utils";

export default function SearchImages() {
  const { uploadHistories, setUploadHistories, loading } = getUploadHistory();

  return (
    <List
      isLoading={loading}
      isShowingDetail={uploadHistories.length !== 0}
      searchBarPlaceholder={"Search images"}
      throttle={true}
    >
      <ListEmptyView icon={Icon.Text} title={"No images"} />
      {uploadHistories.map((value, index, array) => {
        return (
          <List.Item
            key={value.hash}
            icon={value.url}
            title={value.filename}
            detail={<UploadHistoryDetail imageData={value} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={"Copy URL"} content={value.url} />
                <Action.CopyToClipboard title={"Copy Hash"} content={value.hash} />
                <ActionPanel.Section>
                  <Action
                    icon={Icon.Clipboard}
                    title={"Copy Image"}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                    onAction={async () => {
                      await downloadAndCopyImage(value.url, value.filename);
                    }}
                  />
                  <Action
                    icon={Icon.Download}
                    title={"Download Image"}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => {
                      downloadImage(value.url, value.filename).then();
                    }}
                  />
                  <Action
                    icon={Icon.Trash}
                    title={"Delete Image"}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => {
                      alertDialog(
                        Icon.Trash,
                        "Delete Image",
                        `Are you sure you want to delete ${value.filename}?`,
                        "Delete Image",
                        async () => {
                          await showToast(Style.Animated, `Deleting ${value.filename}...`);
                          const deleteResult = await deleteImageByHash(value.hash);
                          if (deleteResult.success) {
                            const newArr = [...array];
                            newArr.splice(index, 1);
                            setUploadHistories(newArr);
                          }
                        }
                      ).then();
                    }}
                  />
                </ActionPanel.Section>
                <ActionToSmMs />
                <ActionOpenExtensionPreferences />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
