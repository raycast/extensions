import { Action, Icon, Clipboard, showToast, Toast } from "@raycast/api";

/**
 * Props for the CloudShellAction component
 */
interface CloudShellActionProps {
  /** The GCP project ID to connect to */
  projectId: string;
}

/**
 * Raycast action component that copies the Google Cloud Shell SSH connection command to clipboard.
 *
 * This component generates and copies the `gcloud cloud-shell ssh` command for the specified project.
 * Cloud Shell SSH uses the global --project flag (not zone-specific like compute ssh).
 *
 * @param props - Component props
 * @param props.projectId - The GCP project ID to use in the connection command
 *
 * @example
 * ```tsx
 * <ActionPanel.Section title="Cloud Shell">
 *   <CloudShellAction projectId={selectedProject} />
 * </ActionPanel.Section>
 * ```
 */
export function CloudShellAction({ projectId }: CloudShellActionProps) {
  const handleCopyCloudShellCommand = async () => {
    // Validate projectId input
    if (!projectId || projectId.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Project Selected",
        message: "Please select a project first",
      });
      return;
    }

    try {
      // Cloud Shell SSH uses the global --project flag
      const command = `gcloud cloud-shell ssh --project=${projectId}`;
      await Clipboard.copy(command);

      await showToast({
        style: Toast.Style.Success,
        title: "Cloud Shell Command Copied",
        message: command,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Copy Command",
        message: error instanceof Error ? error.message : "Could not access clipboard",
      });
    }
  };

  return (
    <Action
      title="Copy Cloud Shell Connection"
      icon={Icon.Terminal}
      shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
      onAction={handleCopyCloudShellCommand}
    />
  );
}
