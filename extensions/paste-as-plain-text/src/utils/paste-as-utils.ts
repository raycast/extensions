import { Clipboard, closeMainWindow, showHUD, updateCommandMetadata } from "@raycast/api";
import { extractNumber, extractUrl, fetchTitle, isEmpty, transform } from "./common-utils";
import { autoFetchTitle, PasteFormat, replaceClipboard } from "../types/types";
import { isJSON, isURL } from "validator";
import fse from "fs-extra";
import { fileURLToPath } from "node:url";

export async function pasteAs(advancedPasteFormat: string) {
  await closeMainWindow();
  const clipboardText = await Clipboard.readText();
  if (!clipboardText || isEmpty(clipboardText)) {
    await showHUD("️🚨 No content in clipboard");
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
      if (isJSON(pasteStr)) {
        pasteStr = JSON.stringify(JSON.parse(pasteStr), null, 2);
        realPasteFormatIcon = "📦";
        realPasteFormat = PasteFormat.JSON;
      }
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
      console.log("file " + file);
      const oldPasteStr = pasteStr;
      if (file) {
        pasteStr = file;
      }
      console.log("oldPasteStr " + oldPasteStr);

      try {
        pasteStr = fileURLToPath(pasteStr);
      } catch (e) {
        console.error(e);
      }

      if (fse.pathExistsSync(pasteStr)) {
        console.log("pasteStr " + pasteStr);
        realPasteFormatIcon = "📃";
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

  await showHUD(`${realPasteFormatIcon} Paste as ${realPasteFormat}`);
  await updateCommandMetadata({
    subtitle: isEmpty(advancedPasteFormat) ? PasteFormat.PLAIN_TEXT : advancedPasteFormat,
  });
  if (isPasteAsFile) {
    await Clipboard.paste({ file: pasteStr });
  } else {
    await Clipboard.paste(pasteStr);
  }
  if (replaceClipboard) {
    if (isPasteAsFile) {
      await Clipboard.copy({ file: pasteStr });
    } else {
      await Clipboard.copy(pasteStr);
    }
  }
}
