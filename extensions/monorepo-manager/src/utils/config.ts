import { getPreferenceValues } from '@raycast/api';
import { DEFAULT_CACHE_DURATION } from './constants';

interface Configs {
  cacheDuration: number;
  mainFieldName?: string;
  rootSourceFolder: string;
  slackRedirectLink?: string;
}

export function getConfigs(): Configs {
  const data = getPreferenceValues<Configs>();
  data.cacheDuration = Number(data.cacheDuration || DEFAULT_CACHE_DURATION);
  return data;
}
