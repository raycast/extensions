import { ActionPanel, type Application } from "@raycast/api";
import type { Branch, File } from "../types";
import { OpenBranchAction } from "./OpenBranchAction";

export function OpenBranchSubmenuAction(props: { file: File; desktopApp: Application | undefined }) {
  const { file, desktopApp } = props;
  return (
    <ActionPanel.Submenu icon="branch.svg" title="Open Branch" shortcut={{ modifiers: ["cmd"], key: "d" }}>
      {file.branches.map((branch: Branch) => (
        <OpenBranchAction key={branch.key} branch={branch} file={file} desktopApp={desktopApp} />
      ))}
    </ActionPanel.Submenu>
  );
}
