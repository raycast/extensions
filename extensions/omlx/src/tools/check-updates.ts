import { checkForUpdate } from "../lib/omlx";

export default async function () {
  const result = await checkForUpdate();
  return {
    updateAvailable: result.update_available,
    latestVersion: result.latest_version,
    releaseUrl: result.release_url,
    channel: result.update_channel,
    message: result.update_available
      ? `oMLX ${result.latest_version} is available`
      : "oMLX is up to date",
  };
}
