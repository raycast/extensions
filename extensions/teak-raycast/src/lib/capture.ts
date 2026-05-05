import { open, showHUD, showToast, Toast } from "@raycast/api";
import {
  type CreateCardInput,
  createCard,
  getRecoveryHint,
  getUserFacingErrorMessage,
} from "./api";

const URL_INLINE_PATTERN = /(https?:\/\/[^\s]+)/i;

export const extractFirstHttpUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }
  } catch {
    // Fall back to inline extraction below.
  }

  const match = trimmed.match(URL_INLINE_PATTERN);
  if (!match?.[1]) {
    return null;
  }

  try {
    const parsed = new URL(match[1]);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? match[1]
      : null;
  } catch {
    return null;
  }
};

export const saveCardWithFeedback = async (
  input: CreateCardInput,
  options: {
    loadingTitle: string;
  },
) => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: options.loadingTitle,
  });

  try {
    const result = await createCard(input);

    if (result.appUrl) {
      toast.primaryAction = {
        onAction: () => {
          void open(result.appUrl!);
        },
        title: "Open Card",
      };
    }

    if (result.card?.url) {
      toast.secondaryAction = {
        onAction: () => {
          void open(result.card!.url!);
        },
        title: "Open Source URL",
      };
    }

    toast.style = Toast.Style.Success;
    toast.title = "Saved to Teak";
    await showHUD("Teak capture complete");

    return result;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Save failed";
    const hint = getRecoveryHint(error);
    toast.message = hint
      ? `${getUserFacingErrorMessage(error)} ${hint}`
      : getUserFacingErrorMessage(error);
    throw error;
  }
};
