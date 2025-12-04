import { ChatV3Message, RoleType } from "@coze/api";

export const buildUserChatV3Message = (conversation_id: string, bot_id: string, content: string): ChatV3Message => {
  return {
    id: Math.random().toString(),
    role: RoleType.User,
    type: "question",
    content,
    content_type: "text",
    conversation_id,
    bot_id,
    chat_id: "",
    meta_data: {},
    created_at: Date.now(),
    updated_at: Date.now(),
  };
};

export const buildAssistantChatV3Message = (
  conversation_id: string,
  bot_id: string,
  content: string,
): ChatV3Message => {
  return {
    id: Math.random().toString(),
    role: RoleType.Assistant,
    type: "answer",
    content,
    content_type: "text",
    conversation_id,
    bot_id,
    chat_id: "",
    meta_data: {},
    created_at: Date.now(),
    updated_at: Date.now(),
  };
};

export const isImageFile = (filePath: string): boolean => {
  const ext = filePath.toLowerCase().split(".").pop();
  const imageExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "webp",
    "svg",
    "tiff",
    "ico",
    "raw",
    "psd",
    "heic",
    "heif",
    "avif",
  ];
  return !!ext && imageExtensions.includes(ext);
};
