import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { saveCustomProfile } from "../utils/storage";

interface AddCustomProfileFormProps {
  onProfileAdded?: () => void;
}

export function AddCustomProfileForm({ onProfileAdded }: AddCustomProfileFormProps) {
  const { pop } = useNavigation();
  const [browserName, setBrowserName] = useState("");
  const [browserType, setBrowserType] = useState<"chromium" | "firefox">("chromium");
  const [profileName, setProfileName] = useState("");
  const [executablePath, setExecutablePath] = useState("");
  const [profileDirectory, setProfileDirectory] = useState("");

  const [browserNameError, setBrowserNameError] = useState<string | undefined>();
  const [executableError, setExecutableError] = useState<string | undefined>();

  function handleExecutableChange(val: string) {
    setExecutablePath(val);
    if (val.toLowerCase().includes("firefox")) {
      setBrowserType("firefox");
    }
  }

  function handleBrowserNameChange(val: string) {
    setBrowserName(val);
    if (val.toLowerCase().includes("firefox")) {
      setBrowserType("firefox");
    }
  }

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

    const isFirefox = browserType === "firefox";

    const id = "custom_" + Date.now();
    await saveCustomProfile({
      id,
      browserName: browserName.trim(),
      profileName: profileName.trim() || "Default",
      executablePath: executablePath.trim().replace(/^"|"$/g, ""),
      profileDirectory: profileDirectory.trim() || (isFirefox ? "default" : "Default"),
      browserType: isFirefox ? "firefox" : "chromium",
      browserId: isFirefox ? "firefox" : "custom",
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
      <Form.Description text="Add any custom browser or profile folder if it was not auto-detected." />

      <Form.TextField
        id="browserName"
        title="Browser Name"
        placeholder="e.g. Google Chrome, Arc, Brave, Firefox"
        value={browserName}
        onChange={handleBrowserNameChange}
        error={browserNameError}
      />

      <Form.Dropdown
        id="browserType"
        title="Browser Engine"
        value={browserType}
        onChange={(val) => setBrowserType(val as "chromium" | "firefox")}
      >
        <Form.Dropdown.Item value="chromium" title="Chromium-based (Chrome, Edge, Brave, Vivaldi, Arc, Opera)" />
        <Form.Dropdown.Item value="firefox" title="Firefox-based (Firefox, Floorp, LibreWolf, Zen, Waterfox)" />
      </Form.Dropdown>

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
        placeholder="e.g. C:\Program Files\Mozilla Firefox\firefox.exe"
        value={executablePath}
        onChange={handleExecutableChange}
        error={executableError}
      />

      <Form.TextField
        id="profileDirectory"
        title="Profile Name / Directory"
        placeholder="e.g. default-release, or custom profile path"
        value={profileDirectory}
        onChange={setProfileDirectory}
      />
    </Form>
  );
}
