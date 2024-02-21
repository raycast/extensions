import { useEffect, useState } from "react";
import { runAppleScript } from "./utilitaries/AppleScript";
import { Form, ActionPanel, Action, closeMainWindow, popToRoot, showToast, Toast } from "@raycast/api";

export default function Command() {
  const [files, setFiles] = useState<string[]>([]);
  const [newName, setNewName] = useState<string>("");
  const [prefix, setPrefix] = useState<string>("");
  const [suffix, setSuffix] = useState<string>("");
  const [preserveName, setPreserveName] = useState<boolean>(false);

  const getSelectedFiles = async () => {
    try {
      const files = await runAppleScript(`
          tell application "Finder"
            set selectedItems to selection
            set selectedPaths to {}
            repeat with selectedItem in selectedItems
              set end of selectedPaths to (POSIX path of (selectedItem as text))
            end repeat
            return selectedPaths
          end tell
        `);

      const fileList = files.split(/, |\n/).filter(Boolean);
      console.log("Fetched files:", fileList);

      setFiles(fileList);

      if (fileList.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Please select at least one file",
        });
      }
    } catch (error) {
      console.error(error);
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
        const baseName = file.substring(lastSlashIndex + 1, lastDotIndex);
        const extension = lastDotIndex >= 0 ? file.substring(lastDotIndex + 1) : "";
        const prefixWithUnderscore = prefix ? `${prefix}_` : "";
        const suffixWithUnderscore = suffix ? `_${suffix}` : "";
        const newNameWithExtension = preserveName
          ? `${prefixWithUnderscore}${baseName}${suffixWithUnderscore}.${extension}`
          : `${prefixWithUnderscore}${newName}-${i + 1}${suffixWithUnderscore}.${extension}`;

        await runAppleScript(`
          tell application "Finder"
            set theItem to POSIX file "${file}" as alias
            set name of theItem to "${newNameWithExtension}"
          end tell
        `);
      }

      console.log("Finished renaming files.");
      setPreserveName(false);
      await closeMainWindow();
      await popToRoot();
    } catch (error) {
      console.error(error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to rename files",
        message: (error as Error).message,
      });
    }
  };

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Rename" onSubmit={renameFiles} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="newName"
          title="New Name"
          value={newName}
          onChange={setNewName}
          placeholder="Enter new name"
        />
        {files.length > 1 && (
          <>
            <Form.TextField id="prefix" title="Prefix" value={prefix} onChange={setPrefix} placeholder="Enter prefix" />
            <Form.TextField id="suffix" title="Suffix" value={suffix} onChange={setSuffix} placeholder="Enter suffix" />
            <Form.Checkbox
              id="preserveName"
              label="Preserve base name"
              value={preserveName}
              onChange={setPreserveName}
            />
          </>
        )}
        <Form.Separator />
        <Form.Description title="Infos" text={`Files: ${files.length}\nprefix_base-name_suffix.ext `} />
      </Form>
    </>
  );
}
