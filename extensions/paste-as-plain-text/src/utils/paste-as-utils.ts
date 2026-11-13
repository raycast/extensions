import { Clipboard, closeMainWindow, Toast, updateCommandMetadata } from "@raycast/api";
import { extractNumber, extractUrl, fetchTitle, isEmpty, showCustomHUD, transform } from "./common-utils";
import { autoFetchTitle, PasteFormat, replaceClipboard } from "../types/types";
import isURL from "validator/lib/isURL";
import { existsSync } from "node:fs";
import JSON5 from "json5";
import { fileURLToPath } from "node:url";

export async function pasteAs(advancedPasteFormat: string) {
  void showCustomHUD({ title: "Pasting...", style: Toast.Style.Animated });
  const [, clipboardText] = await Promise.all([closeMainWindow(), Clipboard.readText()]);
  if (!clipboardText || isEmpty(clipboardText)) {
    await showCustomHUD({ title: "No content in clipboard", style: Toast.Style.Failure });
    return;
  }

  let realPasteFormatIcon = "📋";
  let realPasteFormat = PasteFormat.PLAIN_TEXT;
  let pasteStr = transform(clipboardText);
  let isPasteAsFile = false;
  switch (advancedPasteFormat) {
    case PasteFormat.PLAIN_TEXT: {
      break;
    }
    case PasteFormat.JSON: {
      // paste as json
      let objType;
      try {
        objType = JSON5.parse(pasteStr);
      } catch (e) {
        console.log("Invalid object type:", e);
        break;
      }
      pasteStr = JSON.stringify(objType, null, 2);
      realPasteFormatIcon = "📦";
      realPasteFormat = PasteFormat.JSON;
      break;
    }
    case PasteFormat.URL: {
      const url = extractUrl(pasteStr);
      if (url) {
        pasteStr = url;
        realPasteFormatIcon = "🔗";
        realPasteFormat = PasteFormat.URL;
      }
      break;
    }
    case PasteFormat.NUMBER: {
      const num = extractNumber(pasteStr);
      if (num) {
        pasteStr = num.toString();
        realPasteFormatIcon = "🔢";
        realPasteFormat = PasteFormat.NUMBER;
      }
      break;
    }
    case PasteFormat.File: {
      const { file } = await Clipboard.read();
      const oldPasteStr = pasteStr;
      if (file) {
        pasteStr = file;
      }
      try {
        pasteStr = fileURLToPath(pasteStr);
      } catch (e) {
        console.error(e);
      }

      if (existsSync(pasteStr)) {
        realPasteFormatIcon = "📄";
        realPasteFormat = PasteFormat.File;
        isPasteAsFile = true;
      } else {
        pasteStr = oldPasteStr;
      }
      break;
    }
    case PasteFormat.MARKDOWN_LINK: {
      // paste as markdown url
      pasteStr = pasteStr.trim();
      const isUrl = isURL(pasteStr, {
        protocols: ["http", "https", "ftp"],
        require_tld: true,
        require_protocol: true,
        require_host: true,
        require_port: false,
        require_valid_protocol: true,
      });
      if (isUrl) {
        pasteStr = `[${autoFetchTitle ? await fetchTitle(pasteStr) : ""}](${pasteStr})`;
        realPasteFormatIcon = "📄";
        realPasteFormat = PasteFormat.MARKDOWN_LINK;
      }
      break;
    }
    case PasteFormat.MARKDOWN_IMAGE: {
      // paste as markdown url
      pasteStr = pasteStr.trim();
      const isUrl = isURL(pasteStr, {
        protocols: ["http", "https", "ftp"],
        require_tld: true,
        require_protocol: true,
        require_host: true,
        require_port: false,
        require_valid_protocol: true,
      });
      if (isUrl) {
        pasteStr = `![${autoFetchTitle ? await fetchTitle(pasteStr) : ""}](${pasteStr})`;
        realPasteFormatIcon = "🏞️";
        realPasteFormat = PasteFormat.MARKDOWN_IMAGE;
      }
      break;
    }
    default: {
      break;
    }
  }

  if (isPasteAsFile) {
    await Clipboard.paste({ file: pasteStr });
  } else {
    await Clipboard.paste(pasteStr);
  }
  // Result HUD and metadata update run after the paste so they never delay it.
  await Promise.all([
    showCustomHUD({ title: `${realPasteFormatIcon} Paste as ${realPasteFormat}` }),
    updateCommandMetadata({ subtitle: isEmpty(advancedPasteFormat) ? PasteFormat.PLAIN_TEXT : advancedPasteFormat }),
  ]);
  if (replaceClipboard) {
    if (isPasteAsFile) {
      await Clipboard.copy({ file: pasteStr });
    } else {
      await Clipboard.copy(pasteStr);
    }
  }
}
