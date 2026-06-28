import { ActionPanel } from "@raycast/api";

import { State } from "@types";

import {
  ConfirmChangeActionItem,
  EditLocalSourceCodeActionItem,
  InstallActionItem,
  InstallPackageActionItem,
  SetupActionItem,
  UninstallActionItem,
} from "@components";

type Props = {
  state: State;
  commandPath?: string;
  onInstall: () => void;
  onUninstall: () => void;
  onSetup: () => void;
  onConfirmSetup: () => void;
  onEditLocal: () => void;
  onInstallPackage: () => void;
};

export function ManagementActionPanel({
  state,
  commandPath,
  onInstall,
  onUninstall,
  onSetup,
  onConfirmSetup,
  onEditLocal,
  onInstallPackage,
}: Props): JSX.Element | null {
  const elements: JSX.Element[] = [];

  const uninstallAction = <UninstallActionItem key="uninstall" onUninstall={onUninstall} />;

  switch (state) {
    case State.Installed:
      {
        if (commandPath) {
          elements.push(
            <EditLocalSourceCodeActionItem key="edit-source-code" path={commandPath} onSetup={onEditLocal} />,
          );
        }

        elements.push(uninstallAction);
      }
      break;

    case State.NotInstalled:
      elements.push(<InstallActionItem key="install" onInstall={onInstall} />);

      elements.push(<InstallPackageActionItem key="install-package" onInstallPackage={onInstallPackage} />);
      break;

    case State.NeedSetup:
      if (commandPath) {
        elements.push(<SetupActionItem key="setup" path={commandPath} onSetup={onSetup} />);
      }

      elements.push(uninstallAction);

      break;

    case State.ChangesDetected:
      elements.push(<ConfirmChangeActionItem key="confirm-setup" onConfirmSetup={onConfirmSetup} />);
      elements.push(uninstallAction);

      break;
  }

  return <ActionPanel.Section children={elements} />;
}
