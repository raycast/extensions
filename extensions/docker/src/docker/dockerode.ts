import { getPreferenceValues } from '@raycast/api';
import Dockerode from '@priithaamer/dockerode';
import { useMemo } from 'react';
import { dockerodeOptions, resolveDockerHost } from './host';

export const useDockerode = () => {
  const { socketPath } = getPreferenceValues<{ socketPath?: string }>();

  return useMemo(() => new Dockerode(dockerodeOptions(resolveDockerHost(socketPath))), [socketPath]);
};
