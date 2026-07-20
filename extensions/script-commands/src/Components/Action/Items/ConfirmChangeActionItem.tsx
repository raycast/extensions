import { ActionPanel } from "@raycast/api";

import { IconConstants } from "Const";

type Props = {
  onConfirmSetup: () => void;
};

export function ConfirmChangeActionItem({ onConfirmSetup }: Props): JSX.Element {
  return (
    <ActionPanel.Item
      icon={IconConstants.ConfirmChange}
      title="Confirm Changes on Script Command"
      onAction={onConfirmSetup}
    />
  );
}
