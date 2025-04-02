import { useCallback } from "react";

import {
  Action,
  ActionPanel,
  captureException,
  getPreferenceValues,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

import { moveOrDelete } from "./utils/files";

import { extname, join } from "node:path";
import { ListFoldersAction } from "./components/list-folders";
import { useFetchFolderFiles } from "./hooks/useFetchFolderFiles";
import { useLocalStorage } from "@raycast/utils";
import { Folder } from "./types/folders";
import { buildException } from "./utils/buildException";

const CleanFolderCommand = () => {
  const { folderToClean } = getPreferenceValues();

  const { value: folders, isLoading: isLoadingFolders } = useLocalStorage<Folder[]>("folders", []);
  const { folderFiles, isLoading: isLoadingFiles, fetchFolderFiles } = useFetchFolderFiles();

  const isLoading = isLoadingFolders || isLoadingFiles;

  const cleanAllFiles = useCallback(() => {
    try {
      if (!folders) return;

      for (const file of folderFiles) {
        const currentPath = join(folderToClean, file);
        const extension = extname(file).toLocaleLowerCase();

        for (const { path, extensions } of folders) {
          if (extensions.includes(extension)) {
            moveOrDelete({
              file,
              currentPath,
              folderPath: path,
            });
          }
        }
      }

      void fetchFolderFiles();
      return showHUD("Folder Cleaned");
    } catch (error) {
      captureException(buildException(error as Error, "Folder not Cleaned", { folders, folderFiles }));
      return showToast(Toast.Style.Failure, "Folder not Cleaned", "Something went wrong");
    }
  }, [folderFiles, folders]);

  const listIsEmpty = folderFiles.length <= 0;

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ListFoldersAction />
        </ActionPanel>
      }
    >
      {listIsEmpty ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No Files Found"
          description="Oops! Looks like there are no files in your folder."
        />
      ) : (
        folderFiles.map((file) => (
          <List.Item
            key={file}
            icon={Icon.Document}
            title={file}
            actions={
              <ActionPanel>
                {folders && folders.length > 0 && (
                  <ActionPanel.Section title="Cleaner Actions">
                    <Action title="Clean All" onAction={cleanAllFiles} icon={Icon.Checkmark} />
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section title="Settings">
                  <ListFoldersAction />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
};

export default CleanFolderCommand;
