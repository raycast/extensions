import { Icon } from "@raycast/api";
import type { HotKey } from "./types";

export const DEFAULT_HOTKEYS: HotKey[] = [
  {
    id: "professional-reply",
    title: "Professional Reply",
    subtitle: "Generate a professional reply",
    prompt:
      "Generate a professional and concise reply to this message and match the tone of the conversation, (Just provide the response):",
    icon: Icon.Reply,
  },
  {
    id: "casual-reply",
    title: "Casual Reply",
    subtitle: "Generate a casual reply",
    prompt:
      "Generate a casual and concise reply to this message and match the tone of the conversation (Just provide the response):",
    icon: Icon.Reply,
  },
  {
    id: "email",
    title: "Email",
    subtitle: "Create an email",
    prompt: "Create an email with this subject and body:",
    icon: Icon.Envelope,
  },
  {
    id: "summarize",
    title: "Summarize",
    subtitle: "Create a brief summary",
    prompt: "Summarize this text in a clear and concise manner:",
    icon: Icon.Document,
  },
  {
    id: "explain",
    title: "Explain",
    subtitle: "Explain in simple terms",
    prompt: "Explain this text in simple, easy-to-understand terms:",
    icon: Icon.QuestionMark,
  },
  {
    id: "improve",
    title: "Improve Writing",
    subtitle: "Enhance grammar and style",
    prompt: "Improve the grammar, style, and clarity of this text:",
    icon: Icon.Pencil,
  },
];
