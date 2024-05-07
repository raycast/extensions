import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  getSelectedFinderItems,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";

export default function RenameFiles() {
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<FileItem[] | null>(null);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [canSubmit, setCanSubmit] = useState(false);

  const getSelectedFiles = async () => {
    setIsLoading(true);
    try {
      const files = await getSelectedFinderItems();

      // Check to see if any files are selected
      if (files.length === 0) {
        await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
        await showHUD("🚫 No files selected");
        return;
      }

      setFiles(
        files.map((file) => {
          const filePathParts = file.path.split("/");
          const fileName = filePathParts[filePathParts.length - 1];
          return {
            name: fileName,
            path: file.path,
            newName: "",
          };
        }),
      );
      setIsLoading(false);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error retrieving selected finder items",
        message: String(error),
      });
    }
  };

  // Load the selected files when the component is mounted
  useEffect(() => {
    getSelectedFiles();
  }, []);

  const updateFiles = () => {
    if (files && findText && replaceText) {
      setFiles(
        files.map((file) => {
          const newName = file.name.replace(new RegExp(findText, "g"), replaceText);
          return {
            ...file,
            newName,
          } as FileItem;
        }),
      );
    }
  };

  const renameFiles = async (values: FormValues) => {
    setIsLoading(true);
    if (files && findText && replaceText && canSubmit) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Renaming files...",
      });

      setFindText(values.find);
      setReplaceText(values.replace);
      updateFiles();

      const totalFiles = files.length;
      let completedFiles = 0;
      let failed = false;
      // Iterate over the files and rename them using AppleScript
      for (const file of files) {
        try {
          await runAppleScript(`
            tell application "Finder"
              set theFile to POSIX file "${file.path}" as alias
              set name of theFile to "${file.newName}"
            end tell
          `);
          completedFiles++;
          toast.title = `Renaming file ${completedFiles}/${totalFiles}`;
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = `Failed to rename: ${file.name}`;
          toast.message = String(error);
          failed = true;
        }
      }
      setIsLoading(false);
      await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
      if (failed) {
        await showHUD("🚫 Failed to rename files");
      } else {
        await showHUD(`✅ Renamed ${totalFiles} Files`);
      }
    } else if (!canSubmit) {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot submit",
        message: "Please hit TAB to preview the new file names before submitting.",
      });
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Files" onSubmit={renameFiles} />
        </ActionPanel>
      }
    >
      <Form.Description
        title=""
        text="Standard search and replace, as well as simple regular expressions, are allowed."
      />
      <Form.TextArea
        id="find"
        title="Find"
        placeholder="Text to find"
        value={findText}
        onChange={setFindText}
        onBlur={updateFiles}
      />
      <Form.TextArea
        id="replace"
        title="Replace"
        placeholder="Text to replace"
        value={replaceText}
        onChange={setReplaceText}
        onBlur={() => {
          updateFiles();
          setCanSubmit(true);
        }}
      />
      <Form.Separator />
      <Form.Description
        title="Preview"
        text={files ? files.map((file) => file.newName || file.name).join("\n") : "loading files..."}
      />
    </Form>
  );
}
