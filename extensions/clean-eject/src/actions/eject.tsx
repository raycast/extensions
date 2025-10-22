import { Action, Icon, showToast, Toast } from '@raycast/api';
import { useExec } from '@raycast/utils';

import type { Volume } from '../types';

export const getEjectCommand = (volume: Volume): string => {
  return `diskutil eject "${volume.path}"`;
};

type EjectActionProps = {
  volume: Volume;
  onSuccess?: () => void;
};

export const EjectAction = ({ volume, onSuccess }: EjectActionProps) => {
  const { mutate } = useExec(getEjectCommand(volume), {
    shell: true,
    execute: false,
    onData: onSuccess,
    failureToastOptions: { title: `Failed to eject ${volume.name}` },
  });

  const ejectDrive = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Ejecting ${volume.name}`,
    });

    try {
      await mutate();

      toast.style = Toast.Style.Success;
      toast.title = `Ejected ${volume.name}`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to eject ${volume.name}`;

      if (err instanceof Error) {
        toast.message = err.message;
      }
    }
  };

  return (
    <Action
      icon={Icon.XMarkCircle}
      title="Eject"
      shortcut={{ modifiers: ['cmd'], key: 'e' }}
      onAction={() => ejectDrive()}
    />
  );
};
