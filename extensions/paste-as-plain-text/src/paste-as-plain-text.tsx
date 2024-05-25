import {
  captureException,
  Clipboard,
  closeMainWindow,
  LaunchProps,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import { extractNumber, extractUrl, isEmpty, transform } from "./utils";
import { PasteFormat, replaceClipboard } from "./types";
import { isJSON, isURL } from "validator";

interface PasteAsArguments {
  advancedPasteFormat: string;
}

export default async (props: LaunchProps<{ arguments: PasteAsArguments }>) => {
  try {
    const { advancedPasteFormat } = props.arguments;
    await pasteAs(advancedPasteFormat);
  } catch (e) {
    captureException(e);
    console.error(e);
  }
};

async function pasteAs(advancedPasteFormat: string) {
  await closeMainWindow();
  const clipboardText = await Clipboard.readText();
  if (!clipboardText || isEmpty(clipboardText)) {
    await showHUD("⭕️ No text in clipboard");
    return;
  }

  let realPasteFormatIcon = "📋";
  let realPasteFormat = PasteFormat.PLAIN_TEXT;
  let pasteStr = transform(clipboardText);
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
      if (num && !isNaN(num)) {
        pasteStr = num.toString();
        realPasteFormatIcon = "🔢";
        realPasteFormat = PasteFormat.NUMBER;
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
        pasteStr = `[](${pasteStr})`;
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
        pasteStr = `![](${pasteStr})`;
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
  await Clipboard.paste(pasteStr);
  if (replaceClipboard) {
    await Clipboard.copy(pasteStr);
  }
}
