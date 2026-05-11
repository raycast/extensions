import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { sendPathToBlip } from "./blip";
import { getFirstSelectedFinderPath } from "./finder";

type Values = {
  path: string[];
};

export default function Command() {
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadFinderSelection() {
      try {
        const path = await getFirstSelectedFinderPath();
        if (isMounted) {
          setSelectedPaths([path]);
        }
      } catch {
        // Finder selection is optional for this command.
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadFinderSelection();

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

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send to Blip" onSubmit={handleSubmit} icon={Icon.Upload} />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose a file or folder to send. If Finder has a current selection, it will appear here automatically. Raycast needs Accessibility permission to trigger Blip's Finder Services action." />
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
