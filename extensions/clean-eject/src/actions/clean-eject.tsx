import { Action, Icon, showToast, Toast } from '@raycast/api';
import { useExec } from '@raycast/utils';

import type { Volume } from '../types';
import { isVolumeCleanable, showMissingPermissionToast } from '../utils';
import { getCleanCommand } from './clean';
import { getEjectCommand } from './eject';

export const getCleanEjectCommand = (volume: Volume): string => {
  return `
  ${getCleanCommand(volume)}
  ${getEjectCommand(volume)}
`;
};

type CleanEjectActionProps = {
  volume: Volume;
  onSuccess?: () => void;
};

export const CleanEjectAction = ({
  volume,
  onSuccess,
}: CleanEjectActionProps) => {
  const { mutate } = useExec(getCleanEjectCommand(volume), {
    shell: true,
    execute: false,
    onData: onSuccess,
    failureToastOptions: { title: `Failed to clean eject ${volume.name}` },
  });

  const handleCleanEject = async () => {
    if (!isVolumeCleanable(volume)) {
      return await showMissingPermissionToast();
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Clean ejecting ${volume.name}`,
    });

    try {
      await mutate();

      toast.style = Toast.Style.Success;
      toast.title = `Clean ejected ${volume.name}`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to clean eject ${volume.name}`;

      if (err instanceof Error) {
        toast.message = err.message;
      }
    }
  };

  return (
    <Action
      icon={Icon.Eject}
      title="Clean & Eject"
      onAction={() => handleCleanEject()}
    />
  );
};
