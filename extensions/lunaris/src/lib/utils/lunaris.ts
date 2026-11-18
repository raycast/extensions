import { API_ENDPOINT } from "@/lib/constants";

type LunarisVersion = {
  version: string;
  versions: { [key: string]: string[] };
};

export async function getGameVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${API_ENDPOINT}/version.json`);
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<LunarisVersion>;
    return data.version ?? null;
  } catch {
    return null;
  }
}

async function fetchVersionedData<T>(fileName: string): Promise<T | undefined> {
  try {
    const version = await getGameVersion();
    if (!version) return undefined;

    const res = await fetch(`${API_ENDPOINT}/${version}/${fileName}`);
    if (!res.ok) return undefined;

    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}

export const getAllCharacters = () => fetchVersionedData<CharactersMap>("charlist.json");
export const getAllWeapons = () => fetchVersionedData<WeaponsMap>("weaponlist.json");
export const getMaterials = () => fetchVersionedData<MaterialItemMap>("materiallist.json");
export const getArtifacts = () => fetchVersionedData<ArtifactsMap>("artifactlist.json");
export const getBanners = async () => {
  try {
    const res = await fetch("https://lunaris.moe/data/banners.json");
    if (!res.ok) return undefined;

    return (await res.json()) as BannersMap;
  } catch {
    return undefined;
  }
};
