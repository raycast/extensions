import { Action, Icon, showToast, Toast } from '@raycast/api';
import { useExec } from '@raycast/utils';

import type { Volume } from '../types';

export const getCleanCommand = (volume: Volume): string => {
  return `
  if [[ -d "${volume.path}" ]]; then
    dot_clean -m "${volume.path}"
    find "${volume.path}" -name .DS_Store -delete
  fi
`;
};

type CleanActionProps = {
  volume: Volume;
  onSuccess?: () => void;
};

export const CleanAction = ({ volume, onSuccess }: CleanActionProps) => {
  const { mutate } = useExec(getCleanCommand(volume), {
    shell: true,
    execute: false,
    onData: onSuccess,
    failureToastOptions: { title: `Failed to clean ${volume.name}` },
  });

  const handleClean = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Cleaning ${volume.name}`,
    });

    try {
      await mutate();

      toast.style = Toast.Style.Success;
      toast.title = `Cleaned ${volume.name}`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to clean ${volume.name}`;

      if (err instanceof Error) {
        toast.message = err.message;
      }
    }
  };

  return (
    <Action icon={Icon.Trash} title="Clean" onAction={() => handleClean()} />
  );
};
