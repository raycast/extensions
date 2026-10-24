import { getPreferenceValues } from '@raycast/api';
import type { CreateClientConfig } from './api/client.gen';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: getPreferenceValues<Preferences>().apiUrl,
});
