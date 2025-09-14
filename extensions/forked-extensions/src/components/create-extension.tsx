import os from "node:os";
import path from "node:path";
import {
  Action,
  Clipboard,
  Icon,
  LaunchType,
  confirmAlert,
  launchCommand,
  openExtensionPreferences,
} from "@raycast/api";
import { catchError } from "../errors.js";
import * as git from "../git.js";
import { isWindows, simplifyPath } from "../utils.js";

export default function CreateExtension() {
  if (isWindows) return null;
  return (
    <Action
      icon={Icon.NewFolder}
      title="Create Extension"
      onAction={catchError(async () => {
        const extensionsPath = path.join(git.repositoryPath, "extensions");
        const homedirRelativePath = path.relative(os.homedir(), extensionsPath);

        if (homedirRelativePath.startsWith(".config")) {
          await confirmAlert({
            title: "Invalid Repository Location",
            message:
              'Raycast does not support creating extensions inside the "~/.config" directory. Please consider change another location to store your repository.',
            primaryAction: {
              title: "Open Extension Preferences",
              onAction: catchError(async () => openExtensionPreferences()),
            },
          });
          return;
        }

        await confirmAlert({
          title: "Create Extension",
          message:
            'We will copy the extension path to your clipboard. So that you can simply paste it to the "Location" field of the create extension form.',
          primaryAction: {
            title: "OK",
            onAction: catchError(async () => {
              await Clipboard.copy(simplifyPath(extensionsPath));
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
