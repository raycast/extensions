import { environment } from "@raycast/api";
import { access, mkdir, writeFile } from "fs/promises";
import * as path from "path";

const BASE_URL = "https://selfservice.cedarville.edu";
const PHOTO_DIR = path.join(environment.supportPath, "photos");

// In-memory set to avoid duplicate in-flight fetches
const inflight = new Set<string>();

export async function getCachedPhotoPath(
  personId: string,
  photoUrl: string,
  cookie: string,
): Promise<string | null> {
  await mkdir(PHOTO_DIR, { recursive: true });
  const filePath = path.join(PHOTO_DIR, `${personId}.jpg`);

  try {
    await access(filePath);
    return filePath;
  } catch {
    if (inflight.has(personId)) return null;
    inflight.add(personId);
    try {
      const fullUrl = photoUrl.startsWith("http")
        ? photoUrl
        : `${BASE_URL}${photoUrl}`;
      const headers: Record<string, string> = {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      };
      // Only send the auth cookie for selfservice requests
      if (!photoUrl.startsWith("http")) {
        headers["cookie"] = cookie;
        headers["referer"] = `${BASE_URL}/cedarinfo/directory`;
      }
      const res = await fetch(fullUrl, { headers });
      if (!res.ok) return null;
      await writeFile(filePath, Buffer.from(await res.arrayBuffer()));
      return filePath;
    } catch {
      return null;
    } finally {
      inflight.delete(personId);
    }
  }
}
