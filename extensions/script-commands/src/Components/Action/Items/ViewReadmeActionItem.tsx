import { ReadmeDetail } from "@components";

import { IconConstants, ShortcutConstants } from "Const";

import { CompactGroup } from "@models";

import { PushAction } from "@raycast/api";

type Props = {
  group: CompactGroup;
};

export function ViewReadmeActionItem({ group }: Props): JSX.Element {
  return (
    <PushAction
      icon={IconConstants.Readme}
      shortcut={ShortcutConstants.ViewReadme}
      title="View README"
      target={<ReadmeDetail group={group} />}
    />
  );
}
