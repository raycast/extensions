import { environment } from "@raycast/api";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/// Raycast markdown can't take an inline data URI, so an image drawn for a
/// Detail view is written once to the extension's support folder - named by
/// its content, so each distinct image is written only once - and referenced
/// by file URL. Undefined when it can't be written.
export function imageFile(folder: string, dataURI: string): string | undefined {
  const [meta, data] = dataURI.split(",", 2);
  const extension = meta.includes("svg") ? "svg" : meta.includes("png") ? "png" : "img";
  const bytes = Buffer.from(data, "base64");
  const dir = join(environment.supportPath, folder);
  const path = join(dir, `${createHash("sha1").update(bytes).digest("hex")}.${extension}`);
  try {
    if (!existsSync(path)) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(path, bytes);
    }
  } catch {
    return undefined;
  }
  // `pathToFileURL` also escapes `#` and turns a Windows path (`C:\…`) into a
  // valid URL.
  return pathToFileURL(path).href;
}
