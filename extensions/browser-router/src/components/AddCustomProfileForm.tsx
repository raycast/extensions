import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { saveCustomProfile } from "../utils/storage";

interface AddCustomProfileFormProps {
  onProfileAdded?: () => void;
}

export function AddCustomProfileForm({ onProfileAdded }: AddCustomProfileFormProps) {
  const { pop } = useNavigation();
  const [browserName, setBrowserName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [executablePath, setExecutablePath] = useState("");
  const [profileDirectory, setProfileDirectory] = useState("");

  const [browserNameError, setBrowserNameError] = useState<string | undefined>();
  const [executableError, setExecutableError] = useState<string | undefined>();

  async function handleSubmit() {
    let hasError = false;

    if (!browserName.trim()) {
      setBrowserNameError("Browser name is required");
      hasError = true;
    } else {
      setBrowserNameError(undefined);
    }

    if (!executablePath.trim()) {
      setExecutableError("Executable path is required");
      hasError = true;
    } else {
      setExecutableError(undefined);
    }

    if (hasError) return;

    const id = "custom_" + Date.now();
    await saveCustomProfile({
      id,
      browserName: browserName.trim(),
      profileName: profileName.trim() || "Default",
      executablePath: executablePath.trim().replace(/^"|"$/g, ""),
      profileDirectory: profileDirectory.trim() || "Default",
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Profile Added",
      message: `${browserName} - ${profileName || "Default"}`,
    });

    if (onProfileAdded) {
      onProfileAdded();
    }
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Custom Profile" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add any custom browser or profile folder if it wasn't auto-detected." />

      <Form.TextField
        id="browserName"
        title="Browser Name"
        placeholder="e.g. Google Chrome, Arc, Brave"
        value={browserName}
        onChange={setBrowserName}
        error={browserNameError}
      />

      <Form.TextField
        id="profileName"
        title="Profile Display Name"
        placeholder="e.g. Work, College, Personal"
        value={profileName}
        onChange={setProfileName}
      />

      <Form.TextField
        id="executablePath"
        title="Browser Executable Path"
        placeholder="e.g. C:\Program Files\Google\Chrome\Application\chrome.exe"
        value={executablePath}
        onChange={setExecutablePath}
        error={executableError}
      />

      <Form.TextField
        id="profileDirectory"
        title="Profile Folder Name"
        placeholder="e.g. Profile 1, Default, or custom path"
        value={profileDirectory}
        onChange={setProfileDirectory}
      />
    </Form>
  );
}
