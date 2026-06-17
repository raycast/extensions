import { Cache, Clipboard, getSelectedText, showHUD } from "@raycast/api";
import {
  appendSeparator,
  copyAfterMerging,
  pasteAfterMerging,
  trimAfterAppend,
  trimAfterMerging,
  trimBeforeAppendClipboardText,
  trimBeforeAppendSelectedText,
  trimBeforeMerging,
} from "../types/preferences";
import { MergeOrder } from "../types/types";

export async function appendedText(append = true) {
  try {
    let appendText = await getSelectedText();

    // selected text
    if (trimBeforeAppendSelectedText) {
      appendText = appendText.trim();
    }

    // clipboard text
    let clipBoardText = await Clipboard.readText();
    if (typeof clipBoardText !== "string") {
      clipBoardText = "";
    }
    if (trimBeforeAppendClipboardText) {
      clipBoardText = clipBoardText.trim();
    }

    // appended text
    let finalText: string;
    if (append) {
      finalText = clipBoardText + getAppendSeparator() + appendText;
      await showHUD(`↖️ Appended text to clipboard`);
    } else {
      finalText = appendText + getAppendSeparator() + clipBoardText;
      await showHUD(`↗️ Prepended text to clipboard`);
    }
    if (trimAfterAppend) {
      finalText = finalText.trim();
    }
    await Clipboard.copy(finalText);
  } catch (e) {
    await showHUD(`🚨 Cannot copy selected text from front-most application`);
  }
}

export async function mergeText(num: number, mergeOrder: string) {
  try {
    let mergedClipboard = "";
    const clipboards: string[] = [];
    const appendSeparator_ = getAppendSeparator();
    for (let i = 0; i < num; i++) {
      const clipboard_ = await Clipboard.readText({ offset: i });
      const clipboard = typeof clipboard_ === "string" ? clipboard_ : "";
      clipboards.push(trimBeforeMerging ? clipboard.trim() : clipboard);
    }
    mergedClipboard =
      mergeOrder === MergeOrder.FORWARD_ORDER
        ? clipboards.join(appendSeparator_)
        : clipboards.reverse().join(appendSeparator_);

    if (trimAfterMerging) {
      mergedClipboard = mergedClipboard.trim();
    }
    if (pasteAfterMerging) {
      await Clipboard.paste(mergedClipboard);
      await showHUD(`📋️ Paste merged text`);
    }
    if (copyAfterMerging) {
      await Clipboard.copy(mergedClipboard);
      await showHUD(`📋️ Copy merged text`);
    }
  } catch (e) {
    await showHUD(`🚨 ${String(e)}`);
  }
}

const getAppendSeparator = () => {
  return appendSeparator.replaceAll("{newline}", `\n`).replaceAll("{tab}", `\t`);
};

const getArgument = (arg: string, argKey: string) => {
  const cache = new Cache({ namespace: "Args" });
  if (typeof arg !== "undefined") {
    // call from main window
    cache.set(argKey, arg);
    return arg;
  } else {
    // call from hotkey
    const cacheStr = cache.get(argKey);
    if (typeof cacheStr !== "undefined") {
      return cacheStr;
    } else {
      return "";
    }
  }
};

export const getArguments = (args: string[], argKeys: string[]) => {
  if (args.length !== argKeys.length) {
    return { args: [] };
  } else {
    const argsObj = [];
    for (let i = 0; i < args.length; i++) {
      argsObj.push(getArgument(args[i], argKeys[i]));
    }
    return { args: argsObj };
  }
};
