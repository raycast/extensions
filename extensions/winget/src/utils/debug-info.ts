import { Clipboard, showToast, Toast } from "@raycast/api";
import { DebugInfo } from "./winget-parser";

export async function copyDebugInfo(debug: DebugInfo | undefined, error: string | undefined) {
  const info = {
    error,
    debug: debug
      ? {
          headerLineIndex: debug.headerLineIndex,
          headerLine: debug.headerLine,
          separatorIndex: debug.separatorIndex,
          positions: debug.positions,
          dataStartLine: debug.dataStartLine,
          parseErrors: debug.parseErrors,
          cleanedLinesCount: debug.cleanedLines.length,
          cleanedLinesFirst10: debug.cleanedLines.slice(0, 10),
          rawOutputFirst1000: debug.rawOutput?.substring(0, 1000),
        }
      : null,
  };

  await Clipboard.copy(JSON.stringify(info, null, 2));
  await showToast({
    style: Toast.Style.Success,
    title: "Debug info copied to clipboard",
  });
}
