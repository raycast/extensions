import { Toast, openExtensionPreferences } from "@raycast/api";

export const LONG_TEXT = {
  style: Toast.Style.Animated,
  title: "❗",
  message: "Quite a lot of information in that text, hold on...",
};

export const TEXT_TOO_LONG = {
  style: Toast.Style.Failure,
  title: "❗ Text too long",
  message: "Select a larger model in preferences.",
  primaryAction: {
    title: "Change  Preferences",
    onAction: () => openExtensionPreferences(),
  },
};

export const SUMMARIZING_TEXT = {
  style: Toast.Style.Animated,
  title: "💡",
  message: "Summarizing text...",
};

export const SUCCESS_SUMMARIZING_TEXT = {
  style: Toast.Style.Success,
  title: "📝",
  message: "Text summarized!",
};

export const ERROR_SUMMARIZING_TEXT = {
  style: Toast.Style.Failure,
  title: "🚨",
};

export const NO_ACCESS_TO_RAYCAST_AI = {
  title: "🚨",
  message: "No access to Raycast AI. You need Raycast Pro.",
  style: Toast.Style.Failure,
};

export const NO_OPENAI_KEY = {
  title: "🚨",
  message: "Enter API key in preferences for OpenAI models.",
  style: Toast.Style.Failure,
};

export const FAILED_TO_GET_TEXT = {
  title: "Failed to get text",
  style: Toast.Style.Failure,
  message: "Failed to get selected text",
};

export const OPENAI_COMPLETIONS_ERROR = {
  title: "🚨",
  style: Toast.Style.Failure,
  message: "OpenAI error: ",
};

export const RAYCASTAI_ASK_ERROR = {
  title: "🚨",
  style: Toast.Style.Failure,
  message: "Raycast AI error: ",
};
