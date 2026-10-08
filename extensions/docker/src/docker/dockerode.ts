import { getPreferenceValues } from '@raycast/api';
import Dockerode from '@priithaamer/dockerode';
import { useMemo } from 'react';
import { resolveDockerOptions } from './host';

export const useDockerode = () => {
  const { socketPath } = getPreferenceValues<Preferences>();

  return useMemo(() => new Dockerode(resolveDockerOptions(socketPath)), [socketPath]);
};
