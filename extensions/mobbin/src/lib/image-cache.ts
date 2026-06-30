import { Clipboard, environment } from "@raycast/api";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MobbinError, getErrorMessage } from "./errors";
import type { Screen } from "./types";

function extensionFromContentType(contentType: string | null): string {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg"))
    return "jpg";
  return "png";
}

export function getImageCachePath(screen: Screen, extension = "png"): string {
  const hash = createHash("sha256")
    .update(`${screen.id}:${screen.image_url}`)
    .digest("hex")
    .slice(0, 16);
  return path.join(
    environment.supportPath,
    "images",
    `${screen.id}-${hash}.${extension}`,
  );
}

export async function downloadScreenImage(screen: Screen): Promise<string> {
  let response: Response;
  try {
    response = await fetch(screen.image_url);
  } catch (error) {
    throw new MobbinError(getErrorMessage(error), "network-error");
  }

  if (!response.ok) {
    throw new MobbinError(
      `Failed to download image (${response.status}).`,
      "network-error",
      { status: response.status },
    );
  }

  const extension = extensionFromContentType(
    response.headers.get("Content-Type"),
  );
  const imagePath = getImageCachePath(screen, extension);
  await mkdir(path.dirname(imagePath), { recursive: true });
  await writeFile(imagePath, Buffer.from(await response.arrayBuffer()));
  return imagePath;
}

export async function copyScreenImageFile(screen: Screen): Promise<string> {
  const imagePath = await downloadScreenImage(screen);
  await Clipboard.copy({ file: imagePath });
  return imagePath;
}

export async function pasteScreenImageFile(screen: Screen): Promise<string> {
  const imagePath = await downloadScreenImage(screen);
  await Clipboard.paste({ file: imagePath });
  return imagePath;
}
