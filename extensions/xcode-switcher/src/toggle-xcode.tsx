import React from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Form,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { execSync } from "child_process";
import {
  findXcodesPath,
  parseSelectOutput,
  selectVersion,
  XcodeVersion,
} from "./utils/xcodes";
import {
  getSavedPassword,
  savePassword,
  validatePassword,
  clearPassword,
} from "./utils/auth";

interface PasswordFormProps {
  onPasswordSet: () => void;
}

function PasswordForm({ onPasswordSet }: PasswordFormProps) {
  const { pop } = useNavigation();
  const [password, setPassword] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async () => {
    console.log("[PASSWORD-FORM] Validating password");
    setIsValidating(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Validating password...",
    });

    try {
      const isValid = validatePassword(password);

      if (!isValid) {
        console.log("[PASSWORD-FORM] Password validation failed");
        toast.style = Toast.Style.Failure;
        toast.title = "Invalid Password";
        toast.message = "Please try again";
        setIsValidating(false);
        return;
      }

      console.log("[PASSWORD-FORM] Password valid, saving");
      await savePassword(password);

      toast.style = Toast.Style.Success;
      toast.title = "Password saved successfully";

      console.log("[PASSWORD-FORM] Password saved, closing form");
      pop();
      onPasswordSet();
    } catch (error: any) {
      console.error("[PASSWORD-FORM] Error:", error.message);
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = error.message;
      setIsValidating(false);
    }
  };

  return (
    <Form
      isLoading={isValidating}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Password" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="To switch Xcode versions, we need your macOS password. It will be stored securely in Raycast's local storage." />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Enter your macOS password"
        value={password}
        onChange={setPassword}
      />
      <Form.Description text="⚠️ Your password is stored locally and used only for executing sudo commands to switch Xcode versions." />
    </Form>
  );
}

export default function Command() {
  const [versions, setVersions] = useState<XcodeVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [xcodesPath, setXcodesPath] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    const path = findXcodesPath();
    setXcodesPath(path);

    if (!path) {
      setError("xcodes not found");
      setIsLoading(false);
      showToast({
        style: Toast.Style.Failure,
        title: "xcodes not found",
        message: "Install with: brew install xcodesorg/made/xcodes",
      });
    } else {
      loadVersions(path);
    }
  }, []);

  const loadVersions = (cmdPath: string) => {
    setIsLoading(true);
    setError("");

    try {
      const output = execSync(`${cmdPath} select`, {
        encoding: "utf-8",
        timeout: 5000,
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`,
        },
      });

      const parsed = parseSelectOutput(output);
      if (parsed.length === 0) {
        setError("No Xcode versions found");
      } else {
        setVersions(parsed);
      }
    } catch (err: any) {
      if (err.stdout) {
        const parsed = parseSelectOutput(err.stdout);
        if (parsed.length > 0) {
          setVersions(parsed);
        } else {
          setError("No Xcode versions found");
        }
      } else {
        setError(err.message);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: err.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVersion = async (number: string, version: string) => {
    if (!xcodesPath) return;

    console.log(
      `[TOGGLE-XCODE] handleSelectVersion called for version ${version}`,
    );

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Switching to Xcode ${version}...`,
    });

    try {
      console.log("[TOGGLE-XCODE] Checking for saved password");
      const savedPassword = await getSavedPassword();

      if (!savedPassword) {
        console.log("[TOGGLE-XCODE] No saved password, showing password form");
        toast.style = Toast.Style.Failure;
        toast.title = "Password Required";
        toast.message = "Enter your macOS password";
        return;
      }

      console.log(
        "[TOGGLE-XCODE] Saved password found, proceeding with select",
      );
      await selectVersion(xcodesPath, number, savedPassword);

      console.log("[TOGGLE-XCODE] Version selected successfully");
      toast.style = Toast.Style.Success;
      toast.title = `Xcode ${version} is now active`;

      setTimeout(() => loadVersions(xcodesPath), 1000);
    } catch (error: any) {
      console.error("[TOGGLE-XCODE] Error selecting version:", error.message);

      // If the error is an invalid password, request a new password
      if (error.message.includes("Invalid password")) {
        console.log(
          "[TOGGLE-XCODE] Invalid password, clearing and requesting new one",
        );
        toast.style = Toast.Style.Failure;
        toast.title = "Invalid Password";
        toast.message = "Enter your macOS password";
        return;
      }

      if (error.stdout && error.stdout.includes("Selected")) {
        console.log("[TOGGLE-XCODE] Selection succeeded despite error");
        toast.style = Toast.Style.Success;
        toast.title = `Xcode ${version} is now active`;
        setTimeout(() => loadVersions(xcodesPath), 1000);
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Error";
        toast.message = error.message;
      }
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Error"
          description={error}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View xcodes Documentation"
                url="https://github.com/XcodesOrg/xcodes"
              />
              <Action.OpenInBrowser
                title="Install Homebrew"
                url="https://brew.sh"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {versions.map((xcode) => (
        <List.Item
          key={xcode.number}
          icon={xcode.isSelected ? Icon.CheckCircle : Icon.Circle}
          title={`Xcode ${xcode.version}`}
          subtitle={xcode.build}
          accessories={[{ text: xcode.isSelected ? `✓ Active` : "" }]}
          actions={
            <ActionPanel>
              {!xcode.isSelected && (
                <Action
                  title="Select This Version"
                  icon={Icon.Check}
                  onAction={() =>
                    handleSelectVersion(xcode.number, xcode.version)
                  }
                />
              )}
              <Action
                title="Configure Password"
                icon={Icon.Lock}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() =>
                  push(
                    <PasswordForm
                      onPasswordSet={() => loadVersions(xcodesPath!)}
                    />,
                  )
                }
              />
              <Action
                title="Clear Saved Password"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  console.log("[TOGGLE-XCODE] Clearing password");
                  await clearPassword();
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Password cleared",
                  });
                }}
              />
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => xcodesPath && loadVersions(xcodesPath)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
