import { ActionPanel } from "@raycast/api";

import { IconConstants } from "@constants";

type Props = {
  onInstall: () => void;
};

export function InstallActionItem({ onInstall }: Props): JSX.Element {
  return <ActionPanel.Item icon={IconConstants.Install} title="Install Script Command" onAction={onInstall} />;
}
