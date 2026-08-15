import { Action, Icon } from "@raycast/api";
import { GitSubmodules } from "../GitSubmodules.js";
import { useCheckStatus } from "../../hooks/useGitStatus.js";

interface Props {
  changeRepo: (repoDir: string) => Promise<void>;
}

export function ChangeSubmodules({ changeRepo }: Props) {
  const checkStatus = useCheckStatus();

  return (
    <Action.Push
      title="View Submodules"
      icon={Icon.ArrowsExpand}
      target={<GitSubmodules changeRepo={changeRepo} checkStatus={checkStatus} />}
      shortcut={{
        macOS: { key: "s", modifiers: ["cmd", "shift"] },
        Windows: { key: "s", modifiers: ["ctrl", "shift"] },
      }}
    />
  );
}
