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
import { useCallback, useEffect, useState } from "react";

import { cleanMarkdown } from "../tools/clean-markdown/domain";
import { formatResult } from "../tools/clean-markdown/markdown";

type CleanMarkdownFormValues = {
  text: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Не удалось очистить Markdown";
}

export default function CleanMarkdownCommand() {
  const [sourceText, setSourceText] = useState("");
  const [cleanedText, setCleanedText] = useState<string>();
  const [error, setError] = useState<string>();

  const cleanText = useCallback((text: string) => {
    const normalizedText = text.trim();
    setSourceText(normalizedText);
    setCleanedText(undefined);
    setError(undefined);

    if (!normalizedText) {
      const message = "Введите текст или скопируйте его в буфер обмена";
      setError(message);
      void showToast({ style: Toast.Style.Failure, title: message });
      return;
    }

    try {
      setCleanedText(cleanMarkdown(normalizedText));
      void showToast({
        style: Toast.Style.Success,
        title: "Markdown очищен",
      });
    } catch (cleanError) {
      const message = getErrorMessage(cleanError);
      setError(message);
      void showToast({
        style: Toast.Style.Failure,
        title: "Не удалось очистить Markdown",
        message,
      });
    }
  }, []);

  useEffect(() => {
    let active = true;

    getSelectedText()
      .then((selectedText) => {
        if (active && selectedText.trim()) {
          cleanText(selectedText);
        }
      })
      .catch(() => {
        // No selected text is a normal way to open the command.
      });

    return () => {
      active = false;
    };
  }, [cleanText]);

  if (cleanedText !== undefined) {
    return (
      <Detail
        markdown={formatResult(cleanedText, sourceText)}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Скопировать очищенный текст"
              content={cleanedText}
              icon={Icon.CopyClipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.Paste
              title="Вставить очищенный текст"
              content={cleanedText}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
            <Action
              title="Изменить текст"
              icon={Icon.Pencil}
              onAction={() => {
                setCleanedText(undefined);
                setError(undefined);
              }}
            />
            <Action
              title="Очистить ещё раз"
              icon={Icon.ArrowClockwise}
              onAction={() => cleanText(sourceText)}
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
            title="Очистить Markdown"
            icon={Icon.ClearFormatting}
            onSubmit={(values: CleanMarkdownFormValues) =>
              cleanText(values.text)
            }
          />
          <Action
            title="Использовать текст из буфера"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={async () => {
              const clipboardText = await Clipboard.readText();
              if (clipboardText?.trim()) {
                cleanText(clipboardText);
              } else {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Буфер обмена пуст",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Текст с Markdown"
        placeholder="Выделите текст перед запуском Raycast или вставьте его сюда…"
        value={sourceText}
        onChange={setSourceText}
        autoFocus={!sourceText}
      />
      <Form.Description
        title="Статус"
        text={
          error ??
          "Уберёт **жирный**, *курсив*, ссылки, заголовки и другую Markdown-разметку."
        }
      />
    </Form>
  );
}
