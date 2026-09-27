import { showFailureToast } from "@raycast/utils";
import { InstalledMod, InstalledModDetails, Mod, ModDetails, ModVersion } from "../types";
import { execp, getCliPath } from "./helpers";

const cliPath = getCliPath();

export async function getInstalledMods(): Promise<InstalledMod[]> {
  const res = await execp(`"${cliPath}" mod list --json`, {
    env: { ...process.env, ProgramData: process.env.ProgramData || "C:\\ProgramData" },
  });

  let mods: InstalledMod[];
  try {
    const parsed = JSON.parse(res.stdout);
    mods = parsed?.data?.mods || [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: "Could not get installed mods" });
    return [];
  }

  // The CLI reports updateAvailable but not the new version itself, so the
  // latest version is fetched from the repo - only for updated mods.
  const updateIds = mods.filter((mod) => mod.updateAvailable).map((mod) => mod.id);
  const versionEntries = await Promise.all(
    updateIds.map(async (id) => [id, await fetchLatestRepoVersion(id)] as const),
  );
  const versionById = new Map(versionEntries);

  return mods.map((mod) => ({
    id: mod.id,
    version: mod.version,
    name: mod.name,
    author: mod.author,
    description: mod.description,
    enabled: mod.enabled,
    updateAvailable: mod.updateAvailable,
    availableUpdateVersion: mod.updateAvailable ? (versionById.get(mod.id) ?? null) : null,
  }));
}

async function fetchLatestRepoVersion(id: string): Promise<string | null> {
  try {
    const res = await execp(`"${cliPath}" repo show ${id} --json`);
    const parsed = JSON.parse(res.stdout);
    return parsed?.data?.version ?? null;
  } catch {
    return null;
  }
}

export async function getInstalledModDetails(id: string): Promise<InstalledModDetails> {
  // `mod show [id] --json` does not include enabled/updateAvailable,
  // so they are fetched separately from the installed mods list.
  const [res, installedMods] = await Promise.all([
    execp(`"${cliPath}" mod show ${id} --json`, {
      env: { ...process.env, ProgramData: process.env.ProgramData || "C:\\ProgramData" },
    }),
    getInstalledMods().catch(() => [] as InstalledMod[]),
  ]);

  try {
    const parsed = JSON.parse(res.stdout);
    const installed = installedMods.find((mod) => mod.id === id);

    const modDetails: InstalledModDetails = {
      ...parsed?.data,
      enabled: installed?.enabled ?? false,
      updateAvailable: installed?.updateAvailable ?? false,
      availableUpdateVersion: installed?.availableUpdateVersion ?? null,
    };

    return modDetails;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not get installed mod details for ${id}` });
    return {} as InstalledModDetails;
  }
}

export async function getMods(): Promise<Mod[]> {
  const [repoResult, installedMods] = await Promise.all([
    execp(`"${cliPath}" repo list --json`),
    getInstalledMods().catch(() => []),
  ]);

  try {
    const parsed = JSON.parse(repoResult.stdout);
    const mods: Mod[] = parsed?.data?.mods || [];

    const installedById = new Map(installedMods.map((installedMod) => [installedMod.id, installedMod]));

    return mods.map((mod) => {
      const installedMod = installedById.get(mod.id);

      return {
        id: mod.id,
        metadata: mod.metadata,
        details: mod.details,
        installed: installedMod !== undefined,
        enabled: installedMod?.enabled ?? false,
        updateAvailable: installedMod?.updateAvailable ?? false,
        installedVersion: installedMod?.version ?? null,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: "Could not get mods" });
    return [];
  }
}

export async function getModDetails(id: string): Promise<ModDetails> {
  // `repo show` has no installed-mod info, so the installed
  // version is fetched separately from the installed mods list.
  const [res, installedMods] = await Promise.all([
    execp(`"${cliPath}" repo show ${id} --json`),
    getInstalledMods().catch(() => [] as InstalledMod[]),
  ]);

  try {
    const parsed = JSON.parse(res.stdout);
    const installed = installedMods.find((mod) => mod.id === id);

    const modDetails: ModDetails = {
      ...parsed?.data,
      installed: installed !== undefined,
      enabled: installed?.enabled ?? false,
      updateAvailable: installed?.updateAvailable ?? false,
      installedVersion: installed?.version ?? null,
    };

    return modDetails;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not get mod details for ${id}` });
    return {} as ModDetails;
  }
}

export async function listVersions(id: string) {
  const res = await execp(`"${cliPath}" repo versions ${id} --json`);

  try {
    const parsed = JSON.parse(res.stdout);
    const versions: ModVersion[] = parsed?.data?.versions || [];

    return versions.map((version) => ({
      version: version.version,
      timestamp: version.timestamp,
      isPreRelease: version.isPreRelease,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not get versions for ${id}` });
    return [];
  }
}
