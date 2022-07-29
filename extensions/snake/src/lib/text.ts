import bplist from "bplist-parser";
import afs from "fs/promises";
import fs from "fs";

export enum TextSize {
  Medium,
  Large,
}

export async function getUserTextSize(): Promise<TextSize> {
  let textSize = TextSize.Medium;
  try {
    const home = process.env.HOME;
    if (home) {
      const plist = `${home}/Library/Preferences/com.raycast.macos.plist`;
      await afs.access(plist, fs.constants.F_OK);
      const settings = await bplist.parseFile(plist);
      const sb = JSON.parse(JSON.stringify(settings));
      if (sb && Array.isArray(sb) && sb.length > 0) {
        const ts = sb[0].raycastUI_preferredTextSize as string;
        if (ts === "medium") {
          textSize = TextSize.Medium;
        } else if (ts === "large") {
          textSize = TextSize.Large;
        }
      }
    }
  } catch (err: any) {
    //ignore
  }
  return textSize;
}
