import { createHash, randomBytes } from "crypto";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

function generateSalt(): string {
  return randomBytes(8).toString("hex");
}

export function getCoverArtUrl(coverArtId: string, size = 300): string | null {
  const { navidromeUrl, navidromeUsername, navidromePassword } =
    getPreferenceValues<Preferences>();
  if (!navidromeUrl || !navidromeUsername || !navidromePassword) return null;

  const salt = generateSalt();
  const token = createHash("md5")
    .update(navidromePassword + salt)
    .digest("hex");

  const params = new URLSearchParams({
    u: navidromeUsername,
    t: token,
    s: salt,
    v: "1.16.1",
    c: "raycast-feishin",
    f: "json",
    id: coverArtId,
    size: size.toString(),
  });

  return `${navidromeUrl.replace(/\/$/, "")}/rest/getCoverArt?${params.toString()}`;
}
