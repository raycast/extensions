import {
  Clipboard,
  Toast,
  getSelectedText,
  launchCommand,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import type { LaunchProps, LaunchType } from "@raycast/api";

export const MAX_INPUT = 1_000_000;

export class NoTextError extends Error {
  constructor() {
    super("No text");
    Object.setPrototypeOf(this, NoTextError.prototype);
  }
}

export class OversizeError extends Error {
  constructor(public readonly length: number) {
    super(`Input is ${length} characters; exceeds ${MAX_INPUT}`);
    Object.setPrototypeOf(this, OversizeError.prototype);
  }
}

/** Cross-extension callback descriptor — the LitoMore convention, expressed in built-in SDK types. */
export type CallbackOptions = {
  name: string;
  type: LaunchType;
  extensionName: string;
  ownerOrAuthorName: string;
};

/** Shared shape; callers narrow the role-specific options separately. */
export type BaseLaunchContext = {
  text?: string;
  callbackLaunchOptions?: CallbackOptions;
};

async function getSelection(): Promise<string> {
  try {
    return await getSelectedText();
  } catch {
    return "";
  }
}

/**
 * Read input from the user's preferred source, falling back to the other.
 * Throws `NoTextError` if neither has text.
 */
export async function readContent(
  preferredSource: "selection" | "clipboard",
): Promise<string> {
  const [clipboardRaw, selected] = await Promise.all([
    Clipboard.readText(),
    getSelection(),
  ]);
  const clipboard = clipboardRaw ?? "";
  if (preferredSource === "clipboard") {
    if (clipboard) return clipboard;
    if (selected) return selected;
  } else {
    if (selected) return selected;
    if (clipboard) return clipboard;
  }
  throw new NoTextError();
}

/** Throws OversizeError when input exceeds MAX_INPUT. */
export function guardSize(input: string): void {
  if (input.length > MAX_INPUT) throw new OversizeError(input.length);
}

/** Toast for any failure path. ALWAYS includes Copy Error primaryAction. */
export async function failureToast(
  title: string,
  message: string,
): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: {
      title: "Copy Error",
      onAction: async () => {
        await Clipboard.copy(`${title}: ${message}`);
      },
    },
  });
}

/** Maps known error classes to user-facing failure toasts; falls back to `fallbackTitle`. */
export async function reportFailure(
  error: unknown,
  fallbackTitle: string,
): Promise<void> {
  if (error instanceof NoTextError) {
    await failureToast(
      "No text available",
      "Select text or copy it to the clipboard.",
    );
    return;
  }
  if (error instanceof OversizeError) {
    await failureToast(
      "Text exceeds 1MB limit",
      "Use a text editor for documents this large.",
    );
    return;
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  await failureToast(fallbackTitle, message);
}

export type DeliveryPrefs = {
  action: "paste" | "copy";
  hideHUD: boolean;
  popToRoot: boolean;
};

export type DeliveryContext<C extends BaseLaunchContext> = {
  /** What was launched-context — if `callbackLaunchOptions` is set, we route the callback. */
  launchContext: C | undefined;
  prefs: DeliveryPrefs;
  result: string;
  /** Used in HUD copy: "Pasted wrapped text" / "Copied unwrapped text" / etc. */
  noun: "wrapped" | "unwrapped";
};

/** Deliver result. Cross-extension callback short-circuits paste/copy/HUD. */
export async function deliver<C extends BaseLaunchContext>({
  launchContext,
  prefs,
  result,
  noun,
}: DeliveryContext<C>): Promise<void> {
  if (launchContext?.callbackLaunchOptions) {
    await launchCommand({
      ...launchContext.callbackLaunchOptions,
      context: { result },
    });
    return;
  }
  if (prefs.action === "paste") {
    await Clipboard.paste(result);
  } else {
    await Clipboard.copy(result);
  }
  if (!prefs.hideHUD) {
    const verb = prefs.action === "paste" ? "Pasted" : "Copied";
    await showHUD(`${verb} ${noun} text`);
  }
  if (prefs.popToRoot) {
    await popToRoot();
  }
}

/**
 * Convert the user's `width` preference (a `textfield` returning string) into a
 * positive integer, falling back to 80 on NaN/non-positive input.
 */
export function parseWidth(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 80;
}

/** Re-exported so entry points don't import @raycast/api just for LaunchProps. */
export type { LaunchProps };
