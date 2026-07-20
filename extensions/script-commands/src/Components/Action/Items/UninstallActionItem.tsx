import { ActionPanel } from "@raycast/api";

import { IconConstants, ShortcutConstants } from "Const";

type Props = {
  onUninstall: () => void;
};

export function UninstallActionItem({ onUninstall }: Props): JSX.Element {
  return (
    <ActionPanel.Item
      icon={IconConstants.Uninstall}
      title="Uninstall Script Command"
      shortcut={ShortcutConstants.Uninstall}
      onAction={onUninstall}
    />
  );
}
