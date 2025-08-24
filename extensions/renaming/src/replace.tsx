import { useEffect, useState } from "react";
import { runAppleScript } from "@raycast/utils";
import {
  Form,
  ActionPanel,
  Action,
  closeMainWindow,
  popToRoot,
  showToast,
  Toast,
  getSelectedFinderItems,
  Icon,
} from "@raycast/api";

export default function Command() {
  const [files, setFiles] = useState<string[]>([]);
  const [replaceCharacter, setReplaceCharacter] = useState<string>("");
  const [newCharacter, setNewCharacter] = useState<string>("");

  const getSelectedFiles = async () => {
    try {
      const files = await getSelectedFinderItems();
      const fileList = files.map((file) => file.path);
      console.log("Fetched files:", fileList);

      if (fileList.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Please select at least one file or open a Finder window",
        });
        popToRoot();
        return;
      }

      setFiles(fileList);
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch files",
        message: "Please make sure a Finder window is open and files are selected",
      });
      popToRoot();
    }
  };

  useEffect(() => {
    getSelectedFiles();
  }, []);

  const renameFiles = async () => {
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const lastSlashIndex = file.lastIndexOf("/");
        const lastDotIndex = file.lastIndexOf(".");
        const fileName = file.substring(lastSlashIndex + 1, lastDotIndex);
        const extension = lastDotIndex >= 0 ? file.substring(lastDotIndex + 1) : "";
        const newNameWithExtension = `${fileName.replaceAll(replaceCharacter, newCharacter)}.${extension}`;

        await runAppleScript(`
          tell application "Finder"
            set theItem to POSIX file "${file}" as alias
            set name of theItem to "${newNameWithExtension}"
          end tell
        `);
      }

      console.log("Finished renaming files.");
      await closeMainWindow();
      await popToRoot();
    } catch (error) {
      console.error(error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to replace file characters",
        message: (error as Error).message,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Replace" icon={Icon.Pencil} onSubmit={renameFiles} />
        </ActionPanel>
      }
    >
      {files.length > 0 && (
        <>
          <Form.TextField
            id="replaceCharacter"
            title="Character to Replace"
            value={replaceCharacter}
            onChange={setReplaceCharacter}
            placeholder="Enter character to replace"
          />
          <Form.TextField
            id="newCharacter"
            title="New Character"
            value={newCharacter}
            onChange={setNewCharacter}
            placeholder="Enter new character"
          />
        </>
      )}
      <Form.Separator />
    </Form>
  );
}
