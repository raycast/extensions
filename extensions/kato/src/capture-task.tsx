import {
  Clipboard,
  getFrontmostApplication,
  getSelectedFinderItems,
  getSelectedText,
} from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useEffect, useState } from "react";
import { CreateTaskForm } from "./create-task";
import { accessTokenOptions } from "./oauth";

function titleFrom(value: string) {
  return value
    .split(/\r?\n/)
    .find((line) => line.trim())
    ?.trim()
    .slice(0, 140);
}

function CaptureTaskCommand() {
  const [context, setContext] = useState<{
    suggestedTitle?: string;
    suggestedDescription?: string;
  }>();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let selectedText = "";
      try {
        selectedText = (await getSelectedText()).trim();
      } catch {
        selectedText = "";
      }
      if (!selectedText)
        selectedText = (await Clipboard.readText())?.trim() ?? "";

      const [frontmost, finderItems] = await Promise.all([
        getFrontmostApplication().catch(() => undefined),
        getSelectedFinderItems().catch(() => []),
      ]);
      const fileContext = finderItems.length
        ? `\n\nSelected files:\n${finderItems.map((item) => `- ${item.path}`).join("\n")}`
        : "";
      const sourceContext = frontmost
        ? `\n\nCaptured from ${frontmost.name}.`
        : "";
      if (!cancelled) {
        setContext({
          suggestedTitle:
            titleFrom(selectedText) ??
            titleFrom(finderItems[0]?.path.split("/").at(-1) ?? ""),
          suggestedDescription:
            `${selectedText}${sourceContext}${fileContext}`.trim(),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <CreateTaskForm context={context} />;
}

export default withAccessToken(accessTokenOptions)(CaptureTaskCommand);
