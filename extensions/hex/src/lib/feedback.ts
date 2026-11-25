import { Clipboard, closeMainWindow, open, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { DoneReply } from "./types";
import { errorCode, errorMessage, hex, HEX_RELEASES_URL } from "./hex";
import { openingHex } from "./launch";

function recoveryAction(error: unknown): Toast.ActionOptions | undefined {
  switch (errorCode(error)) {
    case "not-running":
      return {
        title: "Open Hex",
        onAction: async (toast) => {
          toast.hide();
          await startHex();
        },
      };
    case "hex-missing":
    case "cli-missing":
      return {
        title: "Download Hex",
        onAction: () => open(HEX_RELEASES_URL),
      };
    default:
      return undefined;
  }
}

export async function showHexFailure(error: unknown, title: string) {
  await showFailureToast(error, {
    title,
    message: errorMessage(error),
    primaryAction: recoveryAction(error),
  });
}

export async function startHex() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening Hex",
  });
  try {
    await hex(["start"], { timeoutMs: 30_000 });
    await hex(["status"]);
    toast.style = Toast.Style.Success;
    toast.title = "Hex is running";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't open Hex";
    toast.message = errorMessage(error);
  }
}

export function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const OFF_CODES = new Set(["disabled", "feature-off"]);

export async function showFailureHUD(error: unknown, off?: string) {
  const code = errorCode(error);
  if (code === "not-running") {
    await showHUD("Hex isn't running. Open Hex and try again");
  } else if (off && code && OFF_CODES.has(code)) {
    await showHUD(off);
  } else {
    await showHUD(sentence(errorMessage(error)));
  }
}

type ControlOptions = {
  changed?: string | null;
  off?: string;
  timeoutMs?: number;
  launch?: boolean;
};

export async function runControl(args: string[], { changed, off, timeoutMs, launch }: ControlOptions = {}) {
  await closeMainWindow();
  const attempt = () => hex<DoneReply>(args, { timeoutMs });
  try {
    const reply = await (launch ? openingHex(attempt) : attempt());
    const text = reply.changed && changed !== undefined ? changed : reply.message;
    if (text) await showHUD(sentence(text));
  } catch (error) {
    await showFailureHUD(error, off);
  }
}

export async function copyOrPaste(text: string, mode: "copy" | "paste", copied: string) {
  if (mode === "paste") {
    await closeMainWindow();
    await Clipboard.paste(text);
  } else {
    await Clipboard.copy(text);
    await showHUD(copied);
  }
}
