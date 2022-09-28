import { ActionPanel, Application, showToast, Toast } from "@raycast/api";
import { JetBrainsIcon } from "../util";
import { exec } from "child_process";
import React from "react";

interface OpenJetBrainsToolboxProps {
  app: Application | undefined;
}

export function OpenJetBrainsToolbox({ app }: OpenJetBrainsToolboxProps): JSX.Element {
  return (
    <ActionPanel.Item
      icon={JetBrainsIcon}
      title="Launch JetBrains Toolbox"
      onAction={() => {
        exec(`open -b "${app?.bundleId}"`, (err) => err && showToast(Toast.Style.Failure, err?.message));
      }}
    />
  );
}
