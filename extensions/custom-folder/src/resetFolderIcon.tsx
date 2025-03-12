import {
  ActionPanel,
  Form,
  Action,
  showToast,
  Toast,
  popToRoot,
  closeMainWindow,
  getSelectedFinderItems,
} from "@raycast/api";
import fs from "fs";
import { useEffect, useState } from "react";
import { resetFolderIcon } from "./utils/resetFolderIcon";

export default function Command() {
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  useEffect(() => {
    async function getSelectedFolder() {
      try {
        const items = await getSelectedFinderItems();
        if (items.length === 1 && items[0].path && fs.lstatSync(items[0].path).isDirectory()) {
          setSelectedFolder(items[0].path);
        }
      } catch (error) {
        return;
      } finally {
        setIsLoading(false);
      }
    }
    getSelectedFolder();
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Reset Folder Icon"
            onSubmit={async (values: { folder: string[]; image: string[] }) => {
              if (values.folder.length === 0) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Please select a folder.",
                });
                return;
              }
              const folder = values.folder[0];
              if (!fs.existsSync(folder) || !fs.lstatSync(folder).isDirectory()) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Selected folder is not valid.",
                });
                return;
              }

              await closeMainWindow({ clearRootSearch: true });
              showToast({
                style: Toast.Style.Animated,
                title: "Setting Folder Icon",
              });
              await resetFolderIcon(folder);
              await popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Select a Folder"
        value={selectedFolder ? [selectedFolder] : []}
        onChange={(values) => setSelectedFolder(values[0] || "")}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}
