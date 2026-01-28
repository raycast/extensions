import { showToast, Toast, Action } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo } from "react";
import { useApplications, restartApplication } from "../../shared/application";
import { MCPClient, writeMCPConfig } from "../../shared/mcp";
import { RegistryEntry } from "./types";
import { addTextToAIChat } from "./utils";

export function InstallServerToClientAction(props: { registryEntry: RegistryEntry; client: MCPClient }) {
  const { data: applications } = useApplications();

  const application = useMemo(
    () => applications?.find((application) => application.bundleId === props.client.bundleId),
    [applications, props.client.bundleId],
  );

  async function handleInstall() {
    await showToast({ style: Toast.Style.Animated, title: "Installing server" });

    try {
      writeMCPConfig(props.client, {
        mcpServers: {
          [props.registryEntry.name]: props.registryEntry.configuration,
        },
      });

      if (application) {
        await restartApplication(application);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Installed server",
        primaryAction: {
          title: "Open AI Chat",
          shortcut: { modifiers: ["cmd", "shift"], key: "o" },
          onAction: async () => {
            await addTextToAIChat("");
          },
        },
      });
    } catch (e) {
      await showFailureToast(e, { title: "Failed installing server" });
    }
  }

  return (
    <Action
      icon={application?.path ? { fileIcon: application?.path } : undefined}
      title={props.client.title}
      onAction={handleInstall}
    />
  );
}
