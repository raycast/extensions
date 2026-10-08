import { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, useNavigation, showToast, Toast, Icon, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { isWorkerRunning, registerWorker, unregisterWorker } from "../utils/admin-worker";

interface ElevationSetupProps {
  /**
   * Optional callback triggered when clicking Continue after successful worker registration.
   */
  onSetupSuccess?: () => void;
}

export default function ElevationSetup({ onSetupSuccess }: ElevationSetupProps) {
  const { pop } = useNavigation();
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    setIsLoading(true);

    try {
      const registered = await isWorkerRunning();
      setIsRegistered(registered);
    } catch {
      setIsRegistered(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister() {
    setIsLoading(true);
    try {
      await registerWorker();
      setIsRegistered(true);
      await showToast({ style: Toast.Style.Success, title: "Admin worker registered" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showFailureToast(message, { title: "Registration failed" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUnregister() {
    setIsLoading(true);
    try {
      await unregisterWorker();
      setIsRegistered(false);
      await showToast({ style: Toast.Style.Success, title: "Admin worker unregistered" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showFailureToast(message, { title: "Unregister failed" });
    } finally {
      setIsLoading(false);
    }
  }

  function handleContinue() {
    pop();
    if (onSetupSuccess) {
      onSetupSuccess();
    }
  }

  if (isLoading) {
    return <Detail isLoading={true} markdown="## _Checking administrator worker status…_" />;
  }

  const markdownContent = `
# Administrator Privileges Setup

${
  isRegistered
    ? "Status: **Ready (Elevated Worker Active)**\n\nAdministrator setup is active. You can run elevated commands with zero UAC prompts."
    : "Status: **Setup Required**\n\nTo execute elevated actions seamlessly, perform a one-time registration. This will prompt for Windows Administrator rights once."
}

---

Some actions require Windhawk CLI commands to be run as administrator, such as installing / uninstalling mods, enabling / disabling them, and changing their settings.

The UAC prompt may close the Raycast window; open Raycast again to continue.

You can unregister or re-register at any time by opening this page again. \`Manage Mods\` command -> \`Manage Elevation\`.
`;

  return (
    <Detail
      markdown={markdownContent}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={isRegistered ? "Registered" : "Not Registered"}
            icon={
              isRegistered
                ? { source: Icon.Checkmark, tintColor: Color.Green }
                : { source: Icon.XMarkCircle, tintColor: Color.Red }
            }
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {isRegistered ? (
            <>
              <Action title="Continue" icon={Icon.ArrowRight} onAction={handleContinue} />
              <Action title="Unregister Admin Worker" icon={Icon.Trash} onAction={handleUnregister} />
            </>
          ) : (
            <Action title="Register Admin Worker (1-Time UAC)" icon={Icon.Shield} onAction={handleRegister} />
          )}
        </ActionPanel>
      }
    />
  );
}
