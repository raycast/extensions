import { Action, ActionPanel, Form, showToast, Toast, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { saveAccountsToStorage } from "./lib/storage";
import { TOTPAccount } from "./types";

interface SetupFormProps {
  onAccountsLoaded: (accounts: TOTPAccount[]) => void;
}

export default function SetupForm({ onAccountsLoaded }: SetupFormProps) {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      showFailureToast("Please select a JSON file", { title: "Error" });
      return;
    }

    const filePath = selectedFiles[0];
    setIsLoading(true);

    try {
      const accounts = await saveAccountsToStorage(filePath);
      showToast(Toast.Style.Success, "Success", `Loaded ${accounts.length} accounts`);
      onAccountsLoaded(accounts);
    } catch (error) {
      console.error("Failed to load JSON file:", error);
      showFailureToast("Invalid JSON file or format", { title: "Failed to load file" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Load Authenticator Data" icon={Icon.Key} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Select your Proton Authenticator JSON export file" />
      <Form.FilePicker
        id="jsonFile"
        title="JSON Export File"
        value={selectedFiles}
        onChange={setSelectedFiles}
        allowMultipleSelection={false}
        canChooseFiles={true}
        canChooseDirectories={false}
        info="Get this file by going into the Proton Authenticator app settings -> Export"
      />
    </Form>
  );
}
