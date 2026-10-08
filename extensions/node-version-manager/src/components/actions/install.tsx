import { FC } from 'react';
import { Action, Icon, showToast, Toast } from '@raycast/api';
import versionManager from '../../utils/versionManager';

interface Props {
  version: string;
  onUpdateList?: () => void;
}

const InstallAction: FC<Props> = ({ version, onUpdateList }) => {
  return (
    <Action
      title="Install Version"
      onAction={async () => {
        try {
          await showToast(Toast.Style.Animated, `Downloading ${version}`);
          await versionManager.install(version);
          if (onUpdateList) {
            await onUpdateList();
          }
          await showToast(Toast.Style.Success, `Downloaded ${version}`);
        } catch (error) {
          await showToast(Toast.Style.Failure, `Failed to download ${version}, ${(error as Error).message}`);
        }
      }}
      icon={Icon.Download}
      shortcut={{ modifiers: ['cmd'], key: 'i' }}
    />
  );
};

export default InstallAction;
