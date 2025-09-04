import os from "node:os";
import path from "node:path";
import { Action, Clipboard, Icon, LaunchType, confirmAlert, launchCommand } from "@raycast/api";
import { catchError } from "../errors.js";
import { repositoryConfigurationPath } from "../utils.js";

export default function CreateExtension() {
  if (os.platform() !== "darwin") return null;
  return (
    <Action
      icon={Icon.NewFolder}
      title="Create Extension"
      onAction={catchError(async () => {
        const extensionsPath = path.join(repositoryConfigurationPath, "extensions");
        await confirmAlert({
          title: "Create Extension",
          message:
            'We will copy the extension path to your clipboard. So that you can simply paste it to the "Location" field of the create extension form.',
          primaryAction: {
            title: "OK",
            onAction: catchError(async () => {
              await Clipboard.copy(extensionsPath);
              await launchCommand({
                type: LaunchType.UserInitiated,
                name: "create-extension",
                extensionName: "developer",
                ownerOrAuthorName: "raycast",
              });
            }),
          },
        });
      })}
    />
  );
}
