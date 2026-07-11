const API_BASE = "https://api.polyhaven.com";
const USER_AGENT = "PolyHavenRaycastExtension/1.0";

export interface Asset {
  id: string;
  name: string;
  type: number;
  authors: Record<string, string>;
  tags: string[];
  categories: string[];
  download_count: number;
  date_published: number;
  thumbnail_url: string;
}

export interface FileInfo {
  url: string;
  size: number;
  md5: string;
}

export interface AssetFiles {
  hdri?: Record<string, Record<string, FileInfo>>; // resolution -> format -> info
  // Add other types if needed, but we focus on HDRI
}

export async function getAssets(type: "hdris" | "textures" | "models" = "hdris"): Promise<Asset[]> {
  const response = await fetch(`${API_BASE}/assets?t=${type}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch assets: ${response.statusText}`);
  }

  const data = (await response.json()) as Record<string, Omit<Asset, "id">>;

  return Object.entries(data).map(([id, asset]) => ({
    id,
    ...asset,
  }));
}

export async function getAssetFiles(id: string): Promise<AssetFiles> {
  const response = await fetch(`${API_BASE}/files/${id}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch asset files: ${response.statusText}`);
  }

  return (await response.json()) as AssetFiles;
}
