import { Action, Application, captureException, open, showToast, Toast } from "@raycast/api";
import { execPromise, isWin, JetBrainsIcon } from "../util";
import { basename } from "node:path";
import React from "react";

interface OpenJetBrainsToolboxProps {
  app: Application;
  relaunch?: boolean;
}

export async function openToolbox(app: Application, relaunch: boolean) {
  if (relaunch) {
    try {
      if (isWin) {
        await execPromise(`taskkill /F /IM "${basename(app?.path)}"`);
      } else {
        await execPromise(`osascript -e 'quit app "${app?.name}"'`);
      }
    } catch (err) {
      captureException(err);
    }
  }
  try {
    await open(app.path);
  } catch (err) {
    captureException(err);
    await showToast(Toast.Style.Failure, err instanceof Error ? err.message : String(err));
  }
}

export function OpenJetBrainsToolbox({ app, relaunch = false }: OpenJetBrainsToolboxProps): React.JSX.Element {
  return (
    <Action
      icon={JetBrainsIcon}
      title={`${relaunch ? "Relaunch" : "Launch"} JetBrains Toolbox`}
      onAction={() => openToolbox(app, relaunch)}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "j" },
        Windows: { modifiers: ["ctrl"], key: "j" },
      }}
    />
  );
}
