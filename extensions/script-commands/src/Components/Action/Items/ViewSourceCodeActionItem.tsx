import { SourceCodeDetail } from "@components";

import { IconConstants, ShortcutConstants } from "Const";

import { ScriptCommand } from "@models";

import { PushAction } from "@raycast/api";

type Props = {
  scriptCommand: ScriptCommand;
};

export function ViewSourceCodeActionItem({ scriptCommand }: Props): JSX.Element {
  return (
    <PushAction
      icon={IconConstants.SourceCode}
      shortcut={ShortcutConstants.ViewSourceCode}
      title="View Source Code"
      target={<SourceCodeDetail scriptCommand={scriptCommand} />}
    />
  );
}
