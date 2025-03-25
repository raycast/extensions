import { useEffect, useState } from "react";
import { runAppleScript, useCachedState } from "@raycast/utils";
import {
  Form,
  ActionPanel,
  Action,
  closeMainWindow,
  popToRoot,
  showToast,
  Toast,
  getSelectedFinderItems,
} from "@raycast/api";

export default function Command() {
  const [files, setFiles] = useState<string[]>([]);
  const [newName, setNewName] = useState<string>("");
  const [prefix, setPrefix] = useState<string>("");
  const [suffix, setSuffix] = useState<string>("");
  const [preserveName, setPreserveName] = useCachedState<boolean>("preserveName", false);
  const [preview, setPreview] = useState<string>("");
  const [separator, setSeparator] = useState<string>("_");
  const [indexSeparator, setIndexSeparator] = useState<string>("-");

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

  const handleSeparatorChange = async (separatorType: "separator" | "indexSeparator", value: string) => {
    if (value.includes("/")) {
      if (separatorType === "separator") {
        setSeparator("");
      } else {
        setIndexSeparator("");
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid separator",
        message: "The separator cannot be a forward slash (/)",
      });
    } else {
      if (separatorType === "separator") {
        setSeparator(value);
      } else {
        setIndexSeparator(value);
      }
    }
  };

  useEffect(() => {
    getSelectedFiles();
  }, []);

  const generateNewName = (index: number): string => {
    const selectedFile = files[index];
    if (!selectedFile) {
      // Handle the case where files[index] is undefined
      return "";
    }
    const lastSlashIndex = selectedFile.lastIndexOf("/");
    const lastDotIndex = selectedFile.lastIndexOf(".");
    const baseName = selectedFile.substring(lastSlashIndex + 1, lastDotIndex);
    const extension = lastDotIndex >= 0 ? selectedFile.substring(lastDotIndex + 1) : "";
    const prefixWithUnderscore = prefix ? `${prefix}${separator}` : "";
    const suffixWithUnderscore = suffix ? `${separator}${suffix}` : "";
    return preserveName
      ? `${prefixWithUnderscore}${baseName}${suffixWithUnderscore}.${extension}`
      : `${prefixWithUnderscore}${newName}${indexSeparator}${index + 1}${suffixWithUnderscore}.${extension}`;
  };

  const renameFiles = async () => {
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const newNameWithExtension = generateNewName(i);

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

  useEffect(() => {
    setPreview(generateNewName(0));
  }, [newName, prefix, suffix, preserveName, files, separator, indexSeparator]);

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Rename" onSubmit={renameFiles} />
          </ActionPanel>
        }
      >
        {files.length > 1 && (
          <>
            <Form.Checkbox
              id="preserveName"
              label="Preserve base name"
              value={preserveName}
              onChange={setPreserveName}
            />
            {!preserveName && (
              <Form.TextField
                id="newName"
                title="New Name"
                value={newName}
                onChange={setNewName}
                placeholder="Enter new name"
              />
            )}
            <Form.TextField id="prefix" title="Prefix" value={prefix} onChange={setPrefix} placeholder="Enter prefix" />
            <Form.TextField id="suffix" title="Suffix" value={suffix} onChange={setSuffix} placeholder="Enter suffix" />
            <Form.TextField
              id="separator"
              title="Separator"
              value={separator}
              onChange={(newValue) => handleSeparatorChange("separator", newValue)}
              placeholder="Enter separator"
            />
            {!preserveName && (
              <Form.TextField
                id="indexSeparator"
                title="Index Separator"
                value={indexSeparator}
                onChange={(newValue) => handleSeparatorChange("indexSeparator", newValue)}
                placeholder="Enter Index separator"
              />
            )}
            <Form.Description title="Preview" text={preview} />
          </>
        )}
        <Form.Separator />
      </Form>
    </>
  );
}
