import { Action, Icon } from "@raycast/api";
import { CreateWorktree } from "../forms/CreateWorktree.js";

interface Props {
  checkBranches: () => void;
}

export function CreateNewWorkTree({ checkBranches }: Props) {
  return (
    <Action.Push
      title="Create a New WorkTree"
      icon={Icon.Tree}
      shortcut={{
        macOS: { key: "n", modifiers: ["cmd", "shift"] },
        Windows: { key: "n", modifiers: ["ctrl", "shift"] },
      }}
      target={<CreateWorktree checkBranches={checkBranches} />}
    />
  );
}
