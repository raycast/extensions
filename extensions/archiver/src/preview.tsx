import { ActionPanel, Action, Icon, getSelectedFinderItems, useNavigation, Form } from "@raycast/api";
import { useEffect, useState } from "react";
import ZipDetailsView from "./zip-details-view";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filePath, setFilePath] = useState<string[]>([]);
  const { push } = useNavigation();

  useEffect(() => {
    getFinderItems();
  }, []);

  async function getFinderItems() {
    try {
      setIsLoading(true);
      const selectedFinderItems = await getSelectedFinderItems();

      if (!selectedFinderItems.length) {
        throw new Error("No files selected");
      }

      const filePath = selectedFinderItems[0].path;

      // Check if file is a ZIP file
      if (!filePath.toLowerCase().endsWith(".zip")) {
        throw new Error("Selected file is not a ZIP file");
      }
      setFilePath([filePath]);

      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open Zip File"
            onSubmit={(values) => {
              if (filePath.length !== 1) {
                // showToast({ title: "Please select a single ZIP file", style: Toast.Style.Failure });
                showFailureToast(new Error("Please select a single ZIP file"));
                return;
              }
              const file = filePath[0];
              push(<ZipDetailsView filePath={file} password={values.password} />);
            }}
            icon={Icon.Folder}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="zipPath"
        title="ZIP File"
        allowMultipleSelection={false}
        value={filePath}
        onChange={(newValue) => setFilePath(newValue)}
      />
      <Form.PasswordField
        id="password"
        title="Password (Optional)"
        info="Enter password if the ZIP file is encrypted"
      />
    </Form>
  );
}
