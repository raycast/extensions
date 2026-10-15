import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import type { Bookmark, Icon } from "../model.ts";
import { persistFallbackIcon } from "../icon-service.ts";
import { registeredDomainOf } from "../site-color.ts";

export async function materializeIcon(
  directory: string,
  bookmark: Bookmark,
): Promise<Bookmark> {
  const icon = bookmark.icon;
  if (!icon) return bookmark;
  if (icon.type === "file") {
    const fileIcon = await persistFallbackIcon(
      directory,
      bookmark.url,
      bookmark.title,
    );
    return {
      ...bookmark,
      icon: fileIcon,
      iconMatchedAt: bookmark.iconMatchedAt,
    };
  }
  if (icon.type === "remote" && icon.cache?.startsWith("data:image/")) {
    if (icon.hash && icon.cache.includes(icon.hash)) return bookmark;
    const fileIcon = await persistDataUrlIcon(
      directory,
      bookmark.url,
      icon.cache,
      icon.bgColor,
    );
    if (!fileIcon) throw new Error("Invalid imported icon data");
    return {
      ...bookmark,
      icon: { ...icon, cache: fileIcon.path },
      iconMatchedAt: bookmark.iconMatchedAt,
    };
  }
  if (icon.type === "custom" && icon.data?.startsWith("data:image/")) {
    if (icon.path && icon.hash && icon.data.includes(icon.hash))
      return bookmark;
    const fileIcon = await persistDataUrlIcon(
      directory,
      bookmark.url,
      icon.data,
      icon.bgColor,
    );
    if (!fileIcon) throw new Error("Invalid imported icon data");
    return {
      ...bookmark,
      icon: { ...fileIcon, fetchedAt: icon.fetchedAt },
      iconMatchedAt: bookmark.iconMatchedAt,
    };
  }
  return bookmark;
}

async function persistDataUrlIcon(
  directory: string,
  bookmarkUrl: string,
  dataUrl: string,
  bgColor?: string,
): Promise<Icon | null> {
  const match = /^data:(image\/[\w+.-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const mime = match[1]!;
  const bytes = Buffer.from(match[2]!, "base64");
  if (!bytes.length || bytes.length > 2 * 1024 * 1024) return null;
  let host = "imported";
  try {
    host = registeredDomainOf(
      new URL(bookmarkUrl.replace(/\{[^}]+\}/g, "x")).hostname,
    );
  } catch {
    /* keep default */
  }
  const iconsDir = path.join(directory, "icons");
  await fs.mkdir(iconsDir, { recursive: true, mode: 0o700 });
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const ext = mime.includes("png")
    ? "png"
    : mime.includes("webp")
      ? "webp"
      : mime.includes("svg")
        ? "svg"
        : mime.includes("gif")
          ? "gif"
          : mime.includes("jpeg") || mime.includes("jpg")
            ? "jpg"
            : "ico";
  const safeHost =
    host.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "host";
  const filePath = path.join(iconsDir, `${safeHost}-${hash}.${ext}`);
  try {
    await fs.writeFile(filePath, bytes, { flag: "wx", mode: 0o600 });
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code !== "EEXIST") throw e;
  }
  return {
    type: "file",
    path: filePath,
    hash,
    fetchedAt: Date.now(),
    bgColor,
  };
}
