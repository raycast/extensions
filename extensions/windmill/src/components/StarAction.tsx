import { Action, Icon } from "@raycast/api";
import { addStar, removeStar } from "../addStar";
import { WorkspaceConfig } from "../types";

export function StarAction({
  starred,
  path,
  onAction,
  kind,
  workspace,
}: {
  starred: boolean;
  path: string;
  kind: string;
  onAction?: () => unknown;
  workspace: WorkspaceConfig;
}) {
  return (
    <Action
      title={starred ? "Remove Star" : "Add Star"}
      icon={starred ? Icon.StarDisabled : Icon.Star}
      onAction={async () => {
        if (starred) {
          await removeStar(path, kind, workspace);
        } else {
          await addStar(path, kind, workspace);
        }
        if (onAction) onAction();
      }}
    />
  );
}
