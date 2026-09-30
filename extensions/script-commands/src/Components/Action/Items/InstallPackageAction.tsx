import { ActionPanel } from "@raycast/api";

import { IconConstants } from "Const";

type Props = {
  onInstallPackage: () => void;
};

export function InstallPackageActionItem({ onInstallPackage }: Props): JSX.Element {
  return <ActionPanel.Item icon={IconConstants.InstallPackage} title="Install Package" onAction={onInstallPackage} />;
}
