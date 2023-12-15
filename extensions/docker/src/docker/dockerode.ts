import { getPreferenceValues } from '@raycast/api';
import Dockerode from '@priithaamer/dockerode';
import { useMemo } from 'react';

export const useDockerode = () => {
  const { socketPath } = getPreferenceValues();

  return useMemo(() => {
    if (socketPath?.startsWith('tcp://')) {
      const url = new URL(socketPath);
      return new Dockerode({ host: url.hostname, port: url.port || 2375 });
    }
    return new Dockerode(socketPath ? { socketPath } : undefined);
    }, [socketPath]);
};
