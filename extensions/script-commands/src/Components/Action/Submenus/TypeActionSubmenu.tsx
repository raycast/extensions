import { ActionPanel } from "@raycast/api";

import { IconConstants, ShortcutConstants } from "Const";

import { Filter, State } from "@types";

type Props = {
  onFilter: (filter: Filter) => void;
};

export function TypeActionSubmenu({ onFilter }: Props): JSX.Element {
  return (
    <ActionPanel.Submenu title="Type" icon={IconConstants.Type} shortcut={ShortcutConstants.Type}>
      <ActionPanel.Item title="Installed" icon={IconConstants.Installed} onAction={() => onFilter(State.Installed)} />
      <ActionPanel.Item title="Need Setup" icon={IconConstants.NeedSetup} onAction={() => onFilter(State.NeedSetup)} />
    </ActionPanel.Submenu>
  );
}
