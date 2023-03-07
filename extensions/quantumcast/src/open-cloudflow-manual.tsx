import { open, getPreferenceValues } from '@raycast/api';

export default async () => {
  const { cloudflowBaseUrl } = getPreferenceValues();
  await open(new URL(`${cloudflowBaseUrl}/manual/manual.html`).toString());
};
