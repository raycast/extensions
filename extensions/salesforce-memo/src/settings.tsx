import React, { useState, useEffect } from "react";
import {
  ActionPanel,
  Form,
  Action,
  showToast,
  Toast,
  Icon,
  getPreferenceValues,
  useNavigation,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";
import { SalesforceService } from "./utils/salesforce";
import fs from "fs";

interface Preferences {
  salesforceUrl: string;
  memoDirectory: string;
}

interface FormValues {
  username: string;
  password: string;
  securityToken: string;
}

export default function Settings() {
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [securityToken, setSecurityToken] = useState("");
  const [hasValidSetup, setHasValidSetup] = useState(true);
  const [setupMessage, setSetupMessage] = useState("");
  const { push } = useNavigation();

  const salesforceService = new SalesforceService();
  const preferences = getPreferenceValues<Preferences>();

  // Validate initial setup
  useEffect(() => {
    verifySetup();
  }, []);

  // Verify required initial settings
  const verifySetup = () => {
    let isValid = true;
    let message = "";

    // Check if memo directory is set
    if (!preferences.memoDirectory) {
      isValid = false;
      message += "• Memo directory is not set.\n";
    } else {
      // Check if directory exists
      try {
        const stats = fs.statSync(preferences.memoDirectory);
        if (!stats.isDirectory()) {
          isValid = false;
          message +=
            "• The configured memo directory is not a valid directory.\n";
        }
      } catch (error) {
        isValid = false;
        message += "• Cannot access the configured memo directory.\n";
      }
    }

    setHasValidSetup(isValid);
    setSetupMessage(message);
  };

  // Open extension preferences
  const openSettings = () => {
    openExtensionPreferences();
  };

  // Load saved credentials if available
  useEffect(() => {
    const loadCredentials = async () => {
      const credentials = await salesforceService.getCredentials();
      if (credentials) {
        setUsername(credentials.username);
        // Do not display password and security token (for security reasons)
      }
    };

    loadCredentials();
  }, []);

  const handleSubmit = async (values: FormValues) => {
    if (!hasValidSetup) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Setup Error",
        message:
          "Please configure the required settings in Raycast preferences",
      });
      return;
    }

    if (!values.username || !values.password) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Input Error",
        message: "Please enter both username and password",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Save credentials
      await salesforceService.saveCredentials({
        username: values.username,
        password: values.password,
        securityToken: values.securityToken || "",
      });

      // Test connection
      const connected = await salesforceService.connect();
      if (connected) {
        await showToast({
          style: Toast.Style.Success,
          title: "Connection Successful",
          message: "Successfully connected to Salesforce",
        });

        // Navigate to settings details screen
        push(
          <SettingsDetail
            username={values.username}
            salesforceUrl={preferences.salesforceUrl}
            memoDirectory={preferences.memoDirectory}
          />,
        );
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Connection Error",
          message: "Failed to connect to Salesforce",
        });
      }
    } catch (error) {
      console.error("Settings save error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "An error occurred while saving settings",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Display warning if settings are not valid
  if (!hasValidSetup) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action
              title="Open Raycast Preferences"
              onAction={openSettings}
              icon={Icon.Gear}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="⚠️ Initial Setup Required"
          text={`Please open Raycast preferences to resolve the following issues:\n\n${setupMessage}\nClick the "Open Raycast Preferences" button to configure the required settings.`}
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Settings"
            onSubmit={handleSubmit}
            icon={Icon.SaveDocument}
          />
          <Action
            title="Open Raycast Preferences"
            onAction={openSettings}
            icon={Icon.Gear}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Salesforce Connection Settings"
        text="Enter your Salesforce authentication information to connect."
      />
      <Form.TextField
        id="username"
        title="Username"
        placeholder="user@example.com"
        value={username}
        onChange={setUsername}
        autoFocus
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Enter password"
        value={password}
        onChange={setPassword}
      />
      <Form.TextField
        id="securityToken"
        title="Security Token"
        placeholder="Enter security token (if required)"
        value={securityToken}
        onChange={setSecurityToken}
        info="May not be required depending on your Salesforce settings"
      />
      <Form.Description
        title="Raycast Settings"
        text={`Memo Save Location: ${preferences.memoDirectory || "Not set"}\nSalesforce URL: ${preferences.salesforceUrl || "Not set (using default)"}`}
      />
      <Form.Description
        title="Help"
        text="If the 'Memo Save Location' is not set, click 'Open Raycast Preferences' in the top right to configure it."
      />
    </Form>
  );
}

function SettingsDetail({
  username,
  salesforceUrl,
  memoDirectory,
}: {
  username: string;
  salesforceUrl: string;
  memoDirectory: string;
}) {
  const markdownContent = `# Salesforce Connection Settings

## Authentication Information
- **Username**: ${username}
- **Authentication Status**: Connected

## Raycast Settings
- **Memo Save Location**: ${memoDirectory || "Not set"}
- **Salesforce URL**: ${salesforceUrl || "Not set (using default)"}

## Notes
- Password and security token are stored locally
- If you need to change authentication information, please enter it again in the settings screen

## Usage Guide
1. Create a memo using the "Create Memo" command
2. View or edit an existing memo using the "View Memos" command
3. Synchronize with Salesforce from the memo details screen
`;

  return <Detail markdown={markdownContent} />;
}
