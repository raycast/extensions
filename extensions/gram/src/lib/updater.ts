import path from "path";
import { getGramExtensionsDir, GramBuild } from "./gram";
import {
  getInstalledExtensions,
  getLatestExtensionDownloadUrl,
  installExtension,
  isExtensionOutdated,
  ZedResponse,
} from "./extension";
import { getIgnoredExtensionsMap } from "./ignore";
import { apiFetch } from "./api";

export async function processBackgroundUpdates(
  gramBuild: GramBuild,
  options: { silent?: boolean } = {},
): Promise<number> {
  const silent = options.silent ?? false;

  const extensionPath = getGramExtensionsDir(gramBuild);
  const installed = await getInstalledExtensions(extensionPath);

  if (installed.length === 0) return 0;

  const installedMap = installed.reduce<Record<string, string>>((acc, ext) => {
    acc[ext.id] = ext.version;
    return acc;
  }, {});

  const url = new URL("https://api.zed.dev/extensions");
  url.searchParams.append("max_schema_version", "1");
  const response = await apiFetch(url.toString(), { silent });

  const json = (await response.json()) as ZedResponse;
  const allExtensions = json.data || [];

  const ignoredMap = await getIgnoredExtensionsMap();

  const outdated = allExtensions.filter((ext) => {
    const installedVersion = installedMap[ext.id];
    return isExtensionOutdated(ext, installedVersion, ignoredMap);
  });

  if (outdated.length === 0) return 0;

  let successCount = 0;
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
    }
  }

  return successCount;
}
