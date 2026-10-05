import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  getSelectedText,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GoogleTranslateProvider } from "../tools/translate/provider";
import { TranslationService } from "../tools/translate/service";
import { formatResult } from "../tools/translate/markdown";
import type { TranslationResult } from "../tools/translate/types";

type TranslateFormValues = {
  text: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Translation failed";
}

export default function TranslateCommand() {
  const service = useMemo(
    () => new TranslationService(new GoogleTranslateProvider()),
    [],
  );
  const requestNumber = useRef(0);
  const [sourceText, setSourceText] = useState("");
  const [result, setResult] = useState<TranslationResult>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const translate = useCallback(
    async (text: string) => {
      const currentRequest = ++requestNumber.current;
      setSourceText(text);
      setResult(undefined);
      setError(undefined);
      setIsLoading(true);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Translating…",
      });

      try {
        const translation = await service.translate(text);
        if (currentRequest !== requestNumber.current) {
          return;
        }

        setResult(translation);
        toast.style = Toast.Style.Success;
        toast.title = "Translation ready";
      } catch (translationError) {
        if (currentRequest !== requestNumber.current) {
          return;
        }

        const message = getErrorMessage(translationError);
        setError(message);
        toast.style = Toast.Style.Failure;
        toast.title = "Translation failed";
        toast.message = message;
      } finally {
        if (currentRequest === requestNumber.current) {
          setIsLoading(false);
        }
      }
    },
    [service],
  );

  useEffect(() => {
    let active = true;

    getSelectedText()
      .then((selectedText) => {
        if (active && selectedText.trim()) {
          void translate(selectedText);
        }
      })
      .catch(() => {
        // No selected text is a normal way to open the command; keep the form empty.
      });

    return () => {
      active = false;
    };
  }, [translate]);

  if (result) {
    return (
      <Detail
        markdown={formatResult(result, sourceText)}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Translation"
              content={result.text}
              icon={Icon.CopyClipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.Paste
              title="Paste Translation"
              content={result.text}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
            <Action
              title="Edit Text"
              icon={Icon.Pencil}
              onAction={() => {
                setResult(undefined);
                setError(undefined);
              }}
            />
            <Action
              title="Translate Again"
              icon={Icon.ArrowClockwise}
              onAction={() => void translate(sourceText)}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isLoading ? "Translating…" : "Translate"}
            icon={Icon.Globe}
            onSubmit={(values: TranslateFormValues) =>
              void translate(values.text)
            }
          />
          <Action
            title="Use Clipboard Text"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={async () => {
              const clipboardText = await Clipboard.readText();
              if (clipboardText?.trim()) {
                void translate(clipboardText);
              } else {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Clipboard is empty",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Select text before opening Raycast, or type it here…"
        value={sourceText}
        onChange={setSourceText}
        autoFocus={!sourceText}
      />
      <Form.Description
        title="Status"
        text={
          error
            ? error
            : isLoading
              ? "Translating selected text…"
              : "Russian and English are detected automatically."
        }
      />
    </Form>
  );
}
