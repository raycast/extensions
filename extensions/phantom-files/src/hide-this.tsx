import { Action, ActionPanel, closeMainWindow, Form, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getFileOrFolderName, getSelectedPath, hideItem } from "./shared/utils";

export default function HideCommand() {
  const [path, setPath] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSelectedPath() {
      const currentPath = await getSelectedPath();
      setPath(currentPath || "");

      setIsLoading(false);
    }
    loadSelectedPath();
  }, []);

  const handleHide = async () => {
    if (!path.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No path specified",
        message: "Please enter or select a file path",
      });
      return;
    }

    try {
      await hideItem(path);
      const name = await getFileOrFolderName(path);
      await showHUD(`👻 Hidden: ${name}`);
      await closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Hide failed",
        message: String(error),
      });
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Hide Item" onSubmit={handleHide} />
        </ActionPanel>
      }
    >
      <Form.Description text="Hide files in Finder or by path" />

      <Form.TextField
        id="path"
        title="File/Folder Path"
        placeholder="Drag item here or enter path"
        value={path}
        onChange={setPath}
      />

      <Form.Description text="↓ Selected in Finder ↓" />
      <Form.TextArea
        id="finderSelection"
        title="Finder Selection"
        placeholder="No selection in Finder"
        value={path || "Select items in Finder first"}
        onChange={() => {}} // Read-only
      />
    </Form>
  );
}
