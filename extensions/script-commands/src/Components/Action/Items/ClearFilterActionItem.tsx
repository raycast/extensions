import { IconConstants, ShortcutConstants } from "Const";

import { ActionPanel } from "@raycast/api";

import { Filter } from "@types";

type Props = {
  onFilter: (filter: Filter) => void;
};

export function ClearFilterActionItem({ onFilter }: Props): JSX.Element {
  return (
    <ActionPanel.Item
      title="Clear filter"
      icon={IconConstants.ClearFilter}
      shortcut={ShortcutConstants.ClearFilter}
      onAction={() => onFilter(null)}
    />
  );
}
