import { getPreferenceValues } from '@raycast/api';
import Dockerode from '@priithaamer/dockerode';
import { useMemo } from 'react';

export const useDockerode = () => {
  const { socketPath } = getPreferenceValues();

  return useMemo(() => new Dockerode(socketPath ? { socketPath } : undefined), [socketPath]);
};
