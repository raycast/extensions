import { FC } from 'react';
import { Action, Icon, showToast, Toast } from '@raycast/api';
import versionManager from '../../utils/versionManager';

interface Props {
  version: string;
  onUpdateList: () => void;
}

const MakeDefaultAction: FC<Props> = ({ version, onUpdateList }) => {
  return (
    <Action
      title="Make Default Version"
      onAction={async () => {
        try {
          await showToast(Toast.Style.Animated, `Setting up ${version}`);
          await versionManager.default(version);
          await onUpdateList();
          await showToast(Toast.Style.Success, `Node ${version} set up`);
        } catch (error) {
          await showToast(Toast.Style.Failure, `Failed to set up ${version}`);
        }
      }}
      icon={Icon.Star}
      shortcut={{ modifiers: ['cmd'], key: 'd' }}
    />
  );
};

export default MakeDefaultAction;
