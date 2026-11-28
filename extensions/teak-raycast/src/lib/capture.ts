import { statSync } from "node:fs";
import { open, showToast, Toast } from "@raycast/api";
import { parseTags } from "teak-sdk";
import {
  type CreateCardInput,
  createCard,
  getRecoveryHint,
  getUserFacingErrorMessage,
  MAX_UPLOAD_BYTES,
  type QuickSaveResponse,
  saveFileCard,
} from "./api";
import { getTeakCardUrl } from "./constants";
import {
  getStoredTeakAccessToken,
  TeakDiscoveryError,
  TeakSignOutRequiredError,
} from "./oauth";
import { grandfatheredApiKey } from "./preferences";

export const parseCaptureExtras = (extras: {
  notes?: string;
  tags?: string;
}): Pick<CreateCardInput, "notes" | "tags"> => {
  const tags = parseTags(extras.tags);
  const notes = extras.notes?.trim();
  return {
    ...(tags?.length ? { tags } : {}),
    ...(notes ? { notes } : {}),
  };
};

const URL_INLINE_PATTERN = /(https?:\/\/[^\s]+)/i;

export const ensureCredentialsForNoViewCommand = async (): Promise<boolean> => {
  if (grandfatheredApiKey()) {
    return true;
  }

  let token: string | null;
  try {
    token = await getStoredTeakAccessToken();
  } catch (error) {
    if (error instanceof TeakSignOutRequiredError) {
      await showToast({
        title: "Sign Out required",
        message: "Open Search Cards, choose Sign Out, then sign in again.",
        style: Toast.Style.Failure,
      });
      return false;
    }
    if (!(error instanceof TeakDiscoveryError)) {
      throw error;
    }
    await showToast({
      title: "Unable to reach Teak",
      message: "Check your connection and try again.",
      style: Toast.Style.Failure,
    });
    return false;
  }
  if (token) {
    return true;
  }

  await showToast({
    message:
      "Open the Search or Quick Save command to sign in with your browser, then run this command again.",
    style: Toast.Style.Failure,
    title: "Sign in to Teak",
  });
  return false;
};

const isHttpUrl = (value: string): boolean => {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

export const extractFirstHttpUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // `new URL` encodes spaces, so a whole sentence would pass as one link.
  if (!/\s/.test(trimmed) && isHttpUrl(trimmed)) {
    return trimmed;
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

const failureMessage = (error: unknown): string => {
  const hint = getRecoveryHint(error);
  return hint
    ? `${getUserFacingErrorMessage(error)} ${hint}`
    : getUserFacingErrorMessage(error);
};

/** Accepts a plain path or a file:// URL, as Raycast's clipboard returns. */
export const toLocalPath = (value: string): string =>
  value.startsWith("file://")
    ? decodeURIComponent(new URL(value).pathname)
    : value;

export const uploadRejection = (path: string): string | null => {
  try {
    const stats = statSync(path);
    if (!stats.isFile()) {
      return "Folders can't be saved. Select files instead.";
    }
    return stats.size <= MAX_UPLOAD_BYTES
      ? null
      : "Files over 100 MB can't be saved.";
  } catch {
    return "Teak couldn't read this file.";
  }
};

export const isUploadableFile = (path: string): boolean =>
  uploadRejection(path) === null;

const SKIPPED_FILES_NOTE =
  "skipped: folders, files over 100 MB and unreadable files can't be saved.";

export const saveFilesWithFeedback = async (
  paths: string[],
  source: string,
  options: { skipped?: number } = {},
): Promise<QuickSaveResponse[]> => {
  const skippedNote = options.skipped
    ? `${options.skipped} ${SKIPPED_FILES_NOTE}`
    : undefined;
  const noun = paths.length === 1 ? "file" : `${paths.length} files`;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Uploading ${noun}…`,
  });
  const saved: QuickSaveResponse[] = [];
  let lastError: unknown;
  for (const [index, path] of paths.entries()) {
    if (paths.length > 1) {
      toast.message = `${index + 1} of ${paths.length}`;
    }
    try {
      saved.push(await saveFileCard(path, { source }, "silent"));
    } catch (error) {
      lastError = error;
    }
  }
  toast.message = undefined;
  if (saved.length === 0) {
    toast.style = Toast.Style.Failure;
    toast.title = "Upload failed";
    toast.message = failureMessage(lastError);
    return saved;
  }
  toast.style = Toast.Style.Success;
  toast.title =
    saved.length === paths.length
      ? `Saved ${noun} to Teak`
      : `Saved ${saved.length} of ${paths.length} files`;
  const notes = [
    lastError ? failureMessage(lastError) : undefined,
    skippedNote,
  ].filter(Boolean);
  if (notes.length > 0) {
    toast.message = notes.join(" ");
  }
  const first = saved[0];
  toast.primaryAction = {
    onAction: () => {
      void open(first?.appUrl ?? getTeakCardUrl(first?.cardId ?? ""));
    },
    title: saved.length === 1 ? "Open Card" : "Open First Card",
  };
  return saved;
};

export const savedToastText = (
  result: Pick<QuickSaveResponse, "resaved" | "wasArchived">,
): { message?: string; title: string } => {
  if (!result.resaved) {
    return { title: "Saved to Teak" };
  }
  return {
    message: result.wasArchived
      ? "Moved back from Archive"
      : "Moved to the top",
    title: "Already saved",
  };
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
    const result = await createCard(input, "silent");

    const appUrl = result.appUrl;
    if (appUrl) {
      toast.primaryAction = {
        onAction: () => {
          void open(appUrl);
        },
        title: "Open Card",
      };
    }

    const sourceUrl = result.card?.url;
    if (sourceUrl) {
      toast.secondaryAction = {
        onAction: () => {
          void open(sourceUrl);
        },
        title: "Open Source URL",
      };
    }

    const { message, title } = savedToastText(result);
    toast.style = Toast.Style.Success;
    toast.title = title;
    toast.message = message;

    return result;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Save failed";
    toast.message = failureMessage(error);
    // Rethrowing would let Raycast replace this toast with its own error.
    return null;
  }
};
