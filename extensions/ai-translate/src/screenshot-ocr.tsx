import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchType,
  PopToRootType,
  closeMainWindow,
  launchCommand,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { autoParagraph, recognizeScreenshotText, stripLineBreaks } from "./ocr-engines";
import { readPreferences } from "./preferences";

export default function Command() {
  const preferences = useMemo(() => readPreferences(), []);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const captureSequence = useRef(0);

  useEffect(() => {
    void capture();
  }, []);

  async function capture() {
    const captureId = ++captureSequence.current;
    setIsLoading(true);

    try {
      await closeMainWindow({ popToRootType: PopToRootType.Suspended });
      const result = await recognizeScreenshotText(preferences);

      if (captureId !== captureSequence.current) return;

      if (!result) {
        setIsLoading(false);
        await showToast({ style: Toast.Style.Failure, title: "No text detected" });
        return;
      }

      setText(result);
      setIsLoading(false);
    } catch (error) {
      if (captureId !== captureSequence.current) return;

      const message = error instanceof Error ? error.message : String(error);
      setIsLoading(false);
      await showToast({ style: Toast.Style.Failure, title: "OCR Failed", message });
    }
  }

  const hasText = text.trim().length > 0;

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Screenshot OCR · ${text.length} chars`}
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
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
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
        placeholder={isLoading ? "Capturing screenshot..." : "No text detected. Press Cmd+R to retake."}
        value={text}
        onChange={setText}
      />
      <Form.Description title="Characters" text={String(text.length)} />
      <Form.Description title="Engine" text={ocrEngineTitle(preferences.ocrEngine)} />
    </Form>
  );
}

function ocrEngineTitle(engine: string): string {
  switch (engine) {
    case "local":
      return "Local macOS Vision";
    case "tesseract":
      return "Tesseract";
    case "baidu":
      return "Baidu OCR";
    default:
      return engine;
  }
}
