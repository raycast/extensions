import path from "path";
import { getGramExtensionsDir, GramBuild } from "./gram";
import {
  getInstalledExtensions,
  getLatestExtensionDownloadUrl,
  installExtension,
  isExtensionOutdated,
  ZedResponse,
  ZedExtension,
} from "./extension";
import { getIgnoredExtensionsMap } from "./ignore";
import { apiFetch } from "./api";

export async function processBackgroundUpdates(
  gramBuild: GramBuild,
  options: { silent?: boolean } = {},
): Promise<{ installed: number; failed: number }> {
  const silent = options.silent ?? false;

  const extensionPath = getGramExtensionsDir(gramBuild);
  const installed = await getInstalledExtensions(extensionPath);

  if (installed.length === 0) return { installed: 0, failed: 0 };

  const ignoredMap = await getIgnoredExtensionsMap();
  const outdated: ZedExtension[] = [];

  for (const installedExt of installed) {
    const url = new URL("https://api.zed.dev/extensions");
    url.searchParams.append("max_schema_version", "1");
    url.searchParams.append("filter", installedExt.id);

    try {
      const response = await apiFetch(url.toString(), { silent });
      const json = (await response.json()) as ZedResponse;

      const remoteExt = (json.data || []).find((e) => e.id === installedExt.id);

      if (remoteExt && isExtensionOutdated(remoteExt, installedExt.version, ignoredMap)) {
        outdated.push(remoteExt);
      }
    } catch (err) {
      console.error(`Failed to fetch registry info for ${installedExt.id}:`, err);
    }
  }

  if (outdated.length === 0) return { installed: 0, failed: 0 };

  let successCount = 0;
  let failedCount = 0;
  const targetInstallDir = path.join(extensionPath, "installed");

  for (const ext of outdated) {
    try {
      await installExtension({
        downloadUrl: getLatestExtensionDownloadUrl(ext),
        extensionId: ext.id,
        targetInstallDir,
        silent,
      });
      successCount++;
    } catch (err) {
      console.error(`Failed to update ${ext.name}:`, err);
      failedCount++;
    }
  }

  return { installed: successCount, failed: failedCount };
}
