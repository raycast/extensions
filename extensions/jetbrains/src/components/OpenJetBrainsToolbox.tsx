import { Action, Application, captureException, showToast, Toast } from "@raycast/api";
import { execPromise, JetBrainsIcon } from "../util";
import React from "react";

interface OpenJetBrainsToolboxProps {
  app: Application;
  relaunch?: boolean;
}

export async function openToolbox(app: Application, relaunch: boolean) {
  if (relaunch) {
    await execPromise(`osascript -e 'quit app "${app?.name}"'`).catch(
      (err) => err && captureException(err) && showToast(Toast.Style.Failure, err?.message)
    );
  }
  execPromise(`open -b "${app?.bundleId}"`).catch((err) => err && showToast(Toast.Style.Failure, err?.message));
}

export function OpenJetBrainsToolbox({ app, relaunch = false }: OpenJetBrainsToolboxProps): React.JSX.Element {
  return (
    <Action
      icon={JetBrainsIcon}
      title={`${relaunch ? "Relaunch" : "Launch"} JetBrains Toolbox`}
      onAction={() => openToolbox(app, relaunch)}
    />
  );
}
