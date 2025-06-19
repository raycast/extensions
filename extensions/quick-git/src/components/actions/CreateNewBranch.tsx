import { Action, Icon, Keyboard } from "@raycast/api";
import { CreateBranch } from "../CreateBranch.js";

interface Props {
  checkBranches: () => void;
}

export function CreateNewBranch({ checkBranches }: Props) {
  return (
    <Action.Push
      title="Create a New Branch"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CreateBranch checkBranches={checkBranches} />}
    />
  );
}
