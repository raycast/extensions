import { open, getPreferenceValues } from '@raycast/api';
import { cloudflow } from 'quantumlib';

export default async () => {
  const { cloudflowBaseUrl } = getPreferenceValues();
  await open(cloudflow.getManualURL(cloudflowBaseUrl));
};
