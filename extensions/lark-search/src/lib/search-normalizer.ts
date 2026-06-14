import { AppTarget } from "./preferences";
import { LarkSearchItem, LarkSearchType } from "./types";
import { cleanText, pickString, stripHighlight } from "./object-utils";

export function normalizeSearchItem(
  raw: unknown,
  type: LarkSearchType,
  index: number,
  target: AppTarget,
): LarkSearchItem {
  const titleHighlighted = pickString(raw, ["title_highlighted"]);
  const summaryHighlighted = pickString(raw, ["summary_highlighted"]);
  const chatName = pickString(raw, ["chat_name", "name"]);
  const senderName = pickString(raw, ["sender.name", "user.name"]);
  const title =
    stripHighlight(titleHighlighted) ??
    pickString(raw, [
      "result_meta.title",
      "title",
      "name",
      "display_name",
      "chat_name",
      "localized_name",
      "sender.name",
      "user.name",
      "message.content",
      "content",
      "text",
    ]) ??
    `${fallbackTitle(type)} ${index + 1}`;

  const id =
    pickString(raw, [
      "id",
      "result_meta.token",
      "token",
      "doc_token",
      "file_token",
      "wiki_token",
      "message_id",
      "message.message_id",
      "chat_id",
      "open_id",
      "user_id",
      "union_id",
      "url",
      "link",
    ]) ?? `${type}:${title}:${index}`;

  const url =
    pickString(raw, [
      "result_meta.url",
      "message_app_link",
      "url",
      "link",
      "web_url",
      "doc_url",
      "app_link",
      "share_url",
      "message.url",
    ]) ?? buildFallbackUrl(type, raw);
  const itemType = inferType(type, raw);

  return {
    id: `${target.key}:${type}:${id}`,
    type: itemType,
    title: cleanText(title) ?? title,
    subtitle: buildSubtitle(raw, itemType, chatName, senderName),
    snippet:
      stripHighlight(summaryHighlighted) ??
      cleanText(
        pickString(raw, [
          "snippet",
          "summary",
          "abstract",
          "description",
          "message.content",
          "content",
          "text",
        ]),
      ),
    url,
    updatedAt: pickString(raw, [
      "updated_at",
      "update_time",
      "result_meta.update_time_iso",
      "modified_time",
      "message.create_time",
      "create_time",
    ]),
    appTargetKey: target.key,
    appName: target.productName,
    applicationName: target.name,
    bundleId: target.bundleId,
    openCount: 0,
    rankScore: 100 - index,
    source: "live",
    raw,
  };
}

function inferType(type: LarkSearchType, raw: unknown): LarkSearchType {
  if (type !== "doc" && type !== "wiki" && type !== "sheet") {
    return type;
  }

  const objectType = pickString(raw, [
    "entity_type",
    "type",
    "result_meta.doc_types",
    "doc_type",
    "result_meta.file_type",
    "file_type",
    "resource_type",
  ])?.toLowerCase();
  if (!objectType) {
    return type;
  }

  if (objectType.includes("wiki")) {
    return "wiki";
  }
  if (
    objectType.includes("sheet") ||
    objectType.includes("bitable") ||
    objectType.includes("table")
  ) {
    return "sheet";
  }
  return "doc";
}

function buildFallbackUrl(type: LarkSearchType, raw: unknown) {
  if (type === "chat") {
    const chatId = pickString(raw, ["chat_id", "id"]);
    return chatId
      ? `https://applink.feishu.cn/client/chat/open?openChatId=${encodeURIComponent(chatId)}`
      : undefined;
  }

  if (type === "contact") {
    const chatId = pickString(raw, ["p2p_chat_id"]);
    return chatId
      ? `https://applink.feishu.cn/client/chat/open?openChatId=${encodeURIComponent(chatId)}`
      : undefined;
  }

  return undefined;
}

function buildSubtitle(
  raw: unknown,
  type: LarkSearchType,
  chatName?: string,
  senderName?: string,
) {
  if (type === "message") {
    return cleanText(
      [chatName, senderName, pickString(raw, ["create_time", "update_time"])]
        .filter(Boolean)
        .join(" · "),
    );
  }

  if (type === "doc" || type === "wiki" || type === "sheet") {
    return cleanText(
      [
        pickString(raw, ["result_meta.owner_name", "owner_name"]),
        pickString(raw, ["result_meta.update_time_iso", "update_time"]),
      ]
        .filter(Boolean)
        .join(" · "),
    );
  }

  if (type === "contact") {
    return cleanText(
      [
        pickString(raw, ["department", "department_name"]),
        pickString(raw, ["enterprise_email", "email"]),
      ]
        .filter(Boolean)
        .join(" · "),
    );
  }

  return cleanText(
    pickString(raw, [
      "subtitle",
      "description",
      "owner.name",
      "department_name",
      "email",
      "enterprise_email",
    ]),
  );
}

function fallbackTitle(type: LarkSearchType) {
  switch (type) {
    case "message":
      return "Message";
    case "chat":
      return "Chat";
    case "contact":
      return "Contact";
    case "wiki":
      return "Wiki";
    case "sheet":
      return "Sheet";
    case "doc":
      return "Document";
  }
}
