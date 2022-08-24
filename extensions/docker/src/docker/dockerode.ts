import { getPreferenceValues } from '@raycast/api';
import Dockerode from '@priithaamer/dockerode';
import { useMemo } from 'react';

export const useDockerode = () => {
  const preferences = getPreferenceValues();

  const docker = useMemo(
    () =>
      new Dockerode({
        socketPath: preferences.socketPath ?? undefined,
      }),
    [preferences.socketPath],
  );

  return docker;
};
