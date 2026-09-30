import { open, getPreferenceValues } from "@raycast/api";

export default async () => {
  const { host, port, ssl } = getPreferenceValues();
  await open(`${ssl ? "https" : "http"}://${host}:${port}/transmission/web/`);
};
