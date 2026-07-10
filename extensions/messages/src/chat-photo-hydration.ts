export type ChatPhotoMode = "off" | "visible" | "all";

export type AvatarKind = "contact-photo" | "generated-contact" | "group-photo" | "group-fallback" | "reply" | "unknown";

export type PhotoSelectableChat = {
  is_group: boolean | number;
  contactId?: string | null;
};

export type AvatarSummarizableChat = {
  is_group: boolean | number;
  avatarKind?: AvatarKind;
  contactId?: string | null;
};

export function normalizePhotoMode(value: unknown): ChatPhotoMode | undefined {
  return value === "off" || value === "visible" || value === "all" ? value : undefined;
}

export function selectPhotoContactIds(
  allChats: readonly PhotoSelectableChat[],
  visibleChats: readonly PhotoSelectableChat[],
  photoMode: ChatPhotoMode,
): string[] {
  if (photoMode === "off") {
    return [];
  }

  const sourceChats = photoMode === "all" ? allChats : visibleChats;
  const contactIds = new Set<string>();

  sourceChats.forEach((chat) => {
    if (chat.is_group === true || chat.is_group === 1) {
      return;
    }

    const contactId = chat.contactId?.trim();
    if (contactId) {
      contactIds.add(contactId);
    }
  });

  return [...contactIds];
}

export function summarizeAvatarRows(chats: readonly AvatarSummarizableChat[]) {
  const summary = {
    rows: chats.length,
    directRows: 0,
    groupRows: 0,
    contactPhotoRows: 0,
    generatedAvatarRows: 0,
    groupPhotoRows: 0,
    groupFallbackRows: 0,
    replyAvatarRows: 0,
    unknownAvatarRows: 0,
    directContactsMissingPhotoRows: 0,
  };

  chats.forEach((chat) => {
    const isGroup = chat.is_group === true || chat.is_group === 1;
    if (isGroup) {
      summary.groupRows += 1;
    } else {
      summary.directRows += 1;
    }

    switch (chat.avatarKind) {
      case "contact-photo":
        summary.contactPhotoRows += 1;
        break;
      case "generated-contact":
        summary.generatedAvatarRows += 1;
        if (!isGroup && chat.contactId) {
          summary.directContactsMissingPhotoRows += 1;
        }
        break;
      case "group-photo":
        summary.groupPhotoRows += 1;
        break;
      case "group-fallback":
        summary.groupFallbackRows += 1;
        break;
      case "reply":
        summary.replyAvatarRows += 1;
        break;
      default:
        summary.unknownAvatarRows += 1;
        break;
    }
  });

  return summary;
}

export function base64ByteLength(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((value.length * 3) / 4) - padding);
}
