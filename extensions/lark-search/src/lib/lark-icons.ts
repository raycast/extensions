import { Image } from "@raycast/api";
import { join } from "node:path";
import { LarkSearchItem } from "./types";
import { cleanText, pickString } from "./object-utils";

type LarkIconKind =
  | "doc"
  | "bitable"
  | "sheet"
  | "pdf"
  | "chat"
  | "contact"
  | "message";

const iconFiles: Record<LarkIconKind, string> = {
  doc: "lark-doc.png",
  bitable: "lark-bitable.png",
  sheet: "lark-sheet.png",
  pdf: "lark-pdf.png",
  chat: "lark-chat.png",
  contact: "lark-contact.png",
  message: "lark-message.png",
};

export const scriptIconFileNames = [...new Set(Object.values(iconFiles))];

export function larkIconForItem(item: LarkSearchItem): Image.ImageLike {
  const kind = inferIconKind(item);
  const avatarUrl = getAvatarUrl(item.raw);

  if (avatarUrl) {
    return isPeopleIcon(kind)
      ? {
          source: avatarUrl,
          mask: Image.Mask.Circle,
          fallback: assetIconPath(kind),
        }
      : { source: avatarUrl, fallback: assetIconPath(kind) };
  }

  const source = assetIconPath(kind);
  return isPeopleIcon(kind) ? { source, mask: Image.Mask.Circle } : source;
}

export function scriptIconForItem(item: LarkSearchItem) {
  return `.assets/${iconFiles[inferIconKind(item)]}`;
}

function isPeopleIcon(kind: LarkIconKind) {
  return kind === "chat" || kind === "contact";
}

function inferIconKind(item: LarkSearchItem): LarkIconKind {
  if (item.type === "chat") {
    return "chat";
  }

  if (item.type === "contact") {
    return "contact";
  }

  if (item.type === "message") {
    return "message";
  }

  const docKind = [
    pickString(item.raw, [
      "result_meta.doc_types",
      "result_meta.file_type",
      "entity_type",
      "doc_type",
      "file_type",
      "resource_type",
      "source.result_meta.doc_types",
      "source.result_meta.file_type",
      "source.entity_type",
      "source.doc_type",
      "source.file_type",
      "source.resource_type",
    ]),
    parseIconInfo(item.raw)?.obj_type,
    parseIconInfo(item.raw)?.file_type,
    item.url,
    item.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (docKind.includes("pdf") || docKind.includes(".pdf")) {
    return "pdf";
  }

  if (
    docKind.includes("bitable") ||
    docKind.includes("base") ||
    docKind.includes("obj_type=8") ||
    item.url?.includes("/base/")
  ) {
    return "bitable";
  }

  if (
    docKind.includes("sheet") ||
    docKind.includes("obj_type=3") ||
    item.url?.includes("/sheets/")
  ) {
    return "sheet";
  }

  return "doc";
}

function parseIconInfo(raw: unknown) {
  const serialized = pickString(raw, [
    "result_meta.icon_info",
    "source.result_meta.icon_info",
  ]);
  if (!serialized) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(serialized) as {
      obj_type?: number;
      file_type?: string | null;
    };

    return {
      obj_type:
        typeof parsed.obj_type === "number"
          ? `obj_type=${parsed.obj_type}`
          : undefined,
      file_type: parsed.file_type ?? undefined,
    };
  } catch {
    return undefined;
  }
}

function getAvatarUrl(raw: unknown) {
  return cleanText(
    pickString(raw, [
      "avatar",
      "avatar_url",
      "avatar.avatar_72",
      "avatar.avatar_240",
      "avatar.avatar_640",
      "user.avatar",
      "user.avatar_url",
      "user.avatar.avatar_72",
      "sender.avatar",
      "sender.avatar_url",
      "active.avatar",
      "source.avatar",
      "source.detail.avatar",
      "detail.avatar",
    ]),
  );
}

function assetIconPath(file: LarkIconKind) {
  return join(__dirname, "assets", iconFiles[file]);
}
