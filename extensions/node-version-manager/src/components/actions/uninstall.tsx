import { FC } from 'react';
import { Action, Icon, showToast, Toast } from '@raycast/api';
import versionManager from '../../utils/versionManager';

interface Props {
  version: string;
  onUpdateList: () => void;
}

const UninstallAction: FC<Props> = ({ version, onUpdateList }) => {
  return (
    <Action
      title="Uninstall Version"
      onAction={async () => {
        try {
          await showToast(Toast.Style.Animated, `Uninstalling ${version}`);
          await versionManager.uninstall(version);
          await onUpdateList();
          await showToast(Toast.Style.Success, `Uninstalled ${version}`);
        } catch (error) {
          await showToast(Toast.Style.Failure, `Failed to uninstall ${version}`);
        }
      }}
      icon={Icon.Trash}
      shortcut={{ modifiers: ['cmd'], key: 'u' }}
    />
  );
};

export default UninstallAction;
