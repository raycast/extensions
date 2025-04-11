import { Action, ActionPanel, closeMainWindow, Form, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getFileOrFolderName, getSelectedPath, unhideItem } from "./shared/utils";

export default function RevealCommand() {
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

  const handleReveal = async () => {
    if (!path.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No path specified",
        message: "Please enter or select a file path",
      });
      return;
    }

    try {
      const name = await getFileOrFolderName(path);
      await unhideItem(path);
      await showHUD(`✨ Revealed: ${name}`);
      await closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Reveal failed",
        message: String(error),
      });
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Reveal Item" onSubmit={handleReveal} />
          <Action.OpenInBrowser
            title="Show Hidden Files Guide"
            url="https://support.apple.com/guide/mac-help/show-or-hide-hidden-files-on-mac-mchlp2313/mac"
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Unhide files in Finder or by path" />

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
