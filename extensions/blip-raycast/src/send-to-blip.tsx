import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { sendPathToBlip } from "./blip";
import { getFirstSelectedFilePath } from "./finder";
import { fileManagerName, isMac } from "./platform";

type Values = {
  path: string[];
};

export default function Command() {
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSelection() {
      try {
        const path = await getFirstSelectedFilePath();
        if (isMounted) {
          setSelectedPaths([path]);
        }
      } catch {
        // File manager selection is optional for this command.
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSelection();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(values: Values) {
    const path = values.path[0];

    try {
      await sendPathToBlip(path);
      await showToast({
        style: Toast.Style.Success,
        title: "Sent to Blip",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send the selected file to Blip.";
      await showToast({
        style: Toast.Style.Failure,
        title: "Blip send failed",
        message,
      });
    }
  }

  const servicesDescription = isMac
    ? "Raycast needs Accessibility permission to trigger Blip's Finder Services action."
    : "Raycast needs Accessibility permission to trigger Blip's context menu action.";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send to Blip" onSubmit={handleSubmit} icon={Icon.Upload} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Choose a file or folder to send. If ${fileManagerName} has a current selection, it will appear here automatically. ${servicesDescription}`}
      />
      <Form.FilePicker
        id="path"
        title="File or Folder"
        value={selectedPaths}
        onChange={setSelectedPaths}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles
      />
    </Form>
  );
}
