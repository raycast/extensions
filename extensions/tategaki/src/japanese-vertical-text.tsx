import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Clipboard, getSelectedText, showToast, Toast } from "@raycast/api";
import { convertToVertical, trimInput } from "./convert";

type SeparatorType = "none" | "space" | "tab";

interface ConversionMode {
  id: SeparatorType;
  title: string;
  separator: string;
}

export const MAX_INPUT_SIZE = 100_000;

const MODES: ConversionMode[] = [
  { id: "none", title: "No Separator", separator: "" },
  { id: "space", title: "Space Separator", separator: " " },
  { id: "tab", title: "Tab Separator", separator: "\t" },
];

function createPreviewMarkdown(input: string, converted: string, source: string): string {
  if (!input) {
    return "**No Text Found**\n\nSelect text or copy to clipboard.";
  }

  const inputPreview = "```\n" + input + "\n```";
  const convertedPreview = "```\n" + converted + "\n```";

  return `**Input Text** (from ${source}):\n\n${inputPreview}\n\n**Converted Result:**\n\n${convertedPreview}`;
}

export async function getInputText(): Promise<{ text: string; source: "selected" | "clipboard" | "none" }> {
  try {
    const selected = await getSelectedText();
    if (selected && selected.trim()) {
      if (selected.length > MAX_INPUT_SIZE) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Text Too Large",
          message: `Maximum ${MAX_INPUT_SIZE.toLocaleString()} characters`,
        });
        return { text: "", source: "none" };
      }
      return { text: trimInput(selected), source: "selected" };
    }
  } catch (error) {
    const isNoSelection = error instanceof Error && error.message.toLowerCase().includes("selected text");
    if (!isNoSelection) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Reading Selection",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const clipboard = await Clipboard.readText();
  if (clipboard && clipboard.trim()) {
    if (clipboard.length > MAX_INPUT_SIZE) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Text Too Large",
        message: `Maximum ${MAX_INPUT_SIZE.toLocaleString()} characters`,
      });
      return { text: "", source: "none" };
    }
    return { text: trimInput(clipboard), source: "clipboard" };
  }

  return { text: "", source: "none" };
}

export default function Command() {
  const [inputText, setInputText] = useState<string>("");
  const [inputSource, setInputSource] = useState<"selected" | "clipboard" | "none">("none");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const result = await getInputText();
      setInputText(result.text);
      setInputSource(result.source);
      setIsLoading(false);

      if (!result.text) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Text Found",
          message: "Select text or copy to clipboard",
        });
      }
    })();
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail>
      {MODES.map((mode) => {
        const converted = inputText ? convertToVertical(inputText, mode.separator) : "";
        return (
          <List.Item
            key={mode.id}
            title={mode.title}
            detail={<List.Item.Detail markdown={createPreviewMarkdown(inputText, converted, inputSource)} />}
            actions={
              <ActionPanel>
                <Action
                  title="Paste in Active App"
                  onAction={async () => {
                    if (converted) {
                      await Clipboard.paste(converted);
                    }
                  }}
                />
                <Action
                  title="Copy to Clipboard"
                  onAction={async () => {
                    if (converted) {
                      await Clipboard.copy(converted);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Copied",
                      });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
