import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  Icon,
  LaunchType,
  launchCommand,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { useEffect, useMemo, useRef, useState } from "react";
import { autoParagraph, recognizeScreenshotText, stripLineBreaks } from "./ocr-engines";
import { openScreenRecordingSettings, reportOcrError } from "./ocr-errors";
import { readPreferences } from "./preferences";

export default function Command() {
  const preferences = useMemo(() => readPreferences(), []);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string>();
  const [needsPermission, setNeedsPermission] = useState(false);
  const [autoCopied, setAutoCopied] = useState(false);
  const captureSequence = useRef(0);
  const autoCopyEnabled = preferences.autoCopyOcr !== false;

  useEffect(() => {
    void capture();
    return () => {
      captureSequence.current += 1;
    };
  }, []);

  async function capture() {
    const captureId = ++captureSequence.current;
    setIsLoading(true);
    setText("");
    setNotice(undefined);
    setNeedsPermission(false);
    setAutoCopied(false);

    await closeMainWindow({ clearRootSearch: false });

    try {
      const result = await recognizeScreenshotText(preferences);

      if (captureId !== captureSequence.current) return;

      activateRaycast();
      setIsLoading(false);
      if (!result) {
        setNotice("No text detected. Press ⌘R to retake.");
        await showToast({ style: Toast.Style.Failure, title: "No text detected" });
        return;
      }

      setText(result);

      const stats = `${result.length} characters · ${countWords(result)} words`;
      let didCopy = false;
      if (autoCopyEnabled) {
        try {
          await Clipboard.copy(result);
          didCopy = true;
        } catch {
          didCopy = false;
        }
      }
      setAutoCopied(didCopy);
      await showToast({
        style: Toast.Style.Success,
        title: didCopy ? "Copied to clipboard" : "Text recognized",
        message: stats,
      });
    } catch (error) {
      if (captureId !== captureSequence.current) return;

      activateRaycast();
      setIsLoading(false);
      const description = await reportOcrError(error);
      setNeedsPermission(description.isPermission);
      setNotice(
        description.isCancelled
          ? "Screenshot cancelled. Press ⌘R to retake."
          : [description.title, description.message].filter(Boolean).join(" — "),
      );
    }
  }

  const hasText = text.trim().length > 0;

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={text.length > 0 ? `Screenshot OCR · ${text.length} chars` : "Screenshot OCR"}
      actions={
        <ActionPanel>
          {hasText && !isLoading && (
            <ActionPanel.Section title="Copy">
              <Action.CopyToClipboard content={text} icon={Icon.Clipboard} title="Copy Text" />
              <Action.CopyToClipboard
                content={stripLineBreaks(text)}
                icon={Icon.ShortParagraph}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                title="Copy Without Line Breaks"
              />
            </ActionPanel.Section>
          )}
          {hasText && !isLoading && (
            <ActionPanel.Section title="Translate">
              <Action
                icon={Icon.Stars}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                title="Translate"
                onAction={() =>
                  void launchCommand({ name: "translate", type: LaunchType.UserInitiated, fallbackText: text })
                }
              />
              <Action
                icon={Icon.Camera}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                title="Screenshot Translate"
                onAction={() => launchCommand({ name: "screenshot-translate", type: LaunchType.UserInitiated })}
              />
            </ActionPanel.Section>
          )}
          {hasText && !isLoading && (
            <ActionPanel.Section title="Format">
              <Action
                icon={Icon.LineChart}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
                title="Strip Line Breaks"
                onAction={() => setText(stripLineBreaks(text))}
              />
              <Action
                icon={Icon.Paragraph}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                title="Auto Paragraph"
                onAction={() => setText(autoParagraph(text))}
              />
              <Action
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                style={Action.Style.Destructive}
                title="Clear Text"
                onAction={() => {
                  setText("");
                  setNotice("Cleared. Press ⌘R to capture again.");
                  setNeedsPermission(false);
                  setAutoCopied(false);
                }}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            {needsPermission && (
              <Action
                icon={Icon.Lock}
                title="Open Screen Recording Settings"
                onAction={() => void openScreenRecordingSettings()}
              />
            )}
            <Action
              icon={Icon.Camera}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              title="Retake Screenshot"
              onAction={() => void capture()}
            />
            <Action icon={Icon.Gear} title="Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="OCR Result"
        placeholder={isLoading ? "Capturing screenshot..." : (notice ?? "No text detected. Press ⌘R to retake.")}
        value={text}
        onChange={setText}
      />
      <Form.Description title="Characters" text={String(text.length)} />
      {hasText && (
        <Form.Description
          title="Clipboard"
          text={
            autoCopied
              ? "✓ Auto-copied on capture"
              : autoCopyEnabled
                ? "Press ⌘C to copy"
                : "Auto-copy off · ⌘C to copy"
          }
        />
      )}
      <Form.Description title="Engine" text={ocrEngineTitle(preferences.ocrEngine)} />
    </Form>
  );
}

function activateRaycast(): void {
  execFile("/usr/bin/osascript", ["-e", 'tell application "Raycast" to activate'], { timeout: 3000 }, () => undefined);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function ocrEngineTitle(engine: string): string {
  switch (engine) {
    case "local":
      return "Local macOS Vision";
    case "tesseract":
      return "Tesseract";
    case "baidu":
      return "Baidu OCR";
    case "gemini":
      return "Google Gemini";
    case "openai":
      return "OpenAI Vision";
    default:
      return engine;
  }
}
