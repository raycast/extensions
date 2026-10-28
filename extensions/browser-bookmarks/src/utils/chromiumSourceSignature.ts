import { stat } from "fs/promises";
import { join } from "path";

async function getFileSignature(filePath: string) {
  try {
    const fileStat = await stat(filePath);
    return `${filePath}:${fileStat.size}:${fileStat.mtimeMs}`;
  } catch {
    return `${filePath}:missing`;
  }
}

export async function getChromiumSourceSignature(path: string, profile: string) {
  const signatures = [await getFileSignature(join(path, "Local State"))];

  if (profile) {
    signatures.push(await getFileSignature(join(path, profile, "Bookmarks")));
    signatures.push(await getFileSignature(join(path, profile, "AccountBookmarks")));
  }

  return signatures.join("|");
}

export async function getChromiumFaviconSignature(path: string, profile: string) {
  return profile ? getFileSignature(join(path, profile, "Favicons")) : "no-profile";
}
