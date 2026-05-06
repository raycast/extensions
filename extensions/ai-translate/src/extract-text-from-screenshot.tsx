import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchProps,
  LaunchType,
  PopToRootType,
  Toast,
  closeMainWindow,
  launchCommand,
  showHUD,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { recognizeScreenshotText } from "./ocr-engines";
import { readPreferences } from "./preferences";

interface ExtractArguments {
  text?: string;
}

interface ExtractLaunchContext {
  text?: string;
}

export default function Command(
  props: LaunchProps<{ arguments: ExtractArguments; launchContext: ExtractLaunchContext }>,
) {
  const initialText = useMemo(
    () => normalizeText(props.launchContext?.text ?? props.arguments?.text ?? props.fallbackText),
    [],
  );
  const [text, setText] = useState(initialText);
  const [isLoading, setIsLoading] = useState(!initialText);

  useEffect(() => {
    if (!initialText) {
      void captureAndOpenResult();
    }
  }, [initialText]);

  async function captureAndOpenResult() {
    setIsLoading(true);
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });

    try {
      const preferences = readPreferences();
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Reading screenshot text...",
        message: ocrEngineTitle(preferences.ocrEngine),
      });
      const recognizedText = await recognizeScreenshotText(preferences);
      toast.hide();

      if (!recognizedText) {
        await showHUD("No text detected");
        setIsLoading(false);
        return;
      }

      await launchCommand({
        name: "extract-text-from-screenshot",
        type: LaunchType.UserInitiated,
        context: { text: recognizedText },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showHUD(`OCR failed: ${message}`);
      setIsLoading(false);
    }
  }

  const compactText = compactOCRText(text);
  const canUseText = text.trim().length > 0;

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Extract Text from Screenshot"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              content={text}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              title="Copy Text"
            />
            <Action
              icon={Icon.Stars}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              title="Translate Text"
              onAction={() => {
                if (canUseText) {
                  void launchCommand({ name: "translate", type: LaunchType.UserInitiated, fallbackText: text });
                }
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              content={compactText}
              icon={Icon.ShortParagraph}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              title="Copy Compact Text"
            />
            <Action
              icon={Icon.Camera}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              title="Retake Screenshot"
              onAction={() => void captureAndOpenResult()}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Extracted Text"
        placeholder={isLoading ? "Reading screenshot text..." : "No text detected yet"}
        value={text}
        onChange={setText}
      />
      <Form.Description title="Characters" text={String(text.length)} />
    </Form>
  );
}

function normalizeText(text: string | undefined): string {
  return (text ?? "").replace(/\r\n/g, "\n").trim();
}

function compactOCRText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function ocrEngineTitle(engine: string): string {
  switch (engine) {
    case "local":
      return "Local macOS Vision";
    case "tesseract":
      return "Tesseract";
    case "baidu":
      return "Baidu OCR";
    case "paddle":
      return "PaddleOCR HTTP";
    default:
      return engine;
  }
}
