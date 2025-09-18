import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { useState } from "react";

const MAX_LEN = 65536;

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function decodeXmlLayer(input: string): string {
  // Декодируем только XML-уровень, чтобы убрать &amp; перед HTML-сущностями
  return input.replace(/&amp;/g, "&");
}

function stripHtmlButKeepEntities(input: string): string {
  return input
    .replace(/<br\s*\/?>(\r?\n)?/gi, "\n")
    .replace(/<\/?p[^>]*>/gi, "")
    .replace(/<\/?nobr[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

async function callRemoteTypograf(
  text: string,
  options?: {
    entityType?: 1 | 2 | 3 | 4;
    useBr?: boolean;
    useP?: boolean;
    maxNobr?: number;
  },
) {
  const entityType = options?.entityType ?? 1; // html entities
  const useBr = options?.useBr ?? false;
  const useP = options?.useP ?? false;
  const maxNobr = options?.maxNobr ?? 0;

  const soapBody =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n` +
    `<soap:Body>\n` +
    ` <ProcessText xmlns="http://typograf.artlebedev.ru/webservices/">\n` +
    `  <text>${escapeXml(text)}</text>\n` +
    `  <entityType>${entityType}</entityType>\n` +
    `  <useBr>${useBr ? 1 : 0}</useBr>\n` +
    `  <useP>${useP ? 1 : 0}</useP>\n` +
    `  <maxNobr>${maxNobr}</maxNobr>\n` +
    ` </ProcessText>\n` +
    `</soap:Body>\n` +
    `</soap:Envelope>`;

  const res = await fetch(
    "https://typograf.artlebedev.ru/webservices/typograf.asmx",
    {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        SOAPAction: '"http://typograf.artlebedev.ru/webservices/ProcessText"',
      },
      body: soapBody,
    },
  );

  const raw = await res.text();
  const startTag = "<ProcessTextResult>";
  const endTag = "</ProcessTextResult>";
  const start = raw.indexOf(startTag);
  const end = raw.indexOf(endTag);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Неверный ответ сервиса «Типограф»");
  }
  const fragment = raw.slice(start + startTag.length, end);
  const xmlDecoded = decodeXmlLayer(fragment);
  return stripHtmlButKeepEntities(xmlDecoded);
}

export default function Command() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  async function onSubmit(values: { source: string }) {
    let text = values.source ?? "";
    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Нет текста",
        message: "Вставьте текст для «Типографа»",
      });
      return;
    }

    if (text.length > MAX_LEN) {
      text = text.slice(0, MAX_LEN);
      await showToast({
        style: Toast.Style.Animated,
        title: "Ограничение 65 536 символов",
        message: "Текст был обрезан до лимита",
      });
    }

    try {
      const result = await callRemoteTypograf(text, {
        entityType: 1,
        useBr: false,
        useP: false,
        maxNobr: 0,
      });
      setOutput(result);
      await showToast({
        style: Toast.Style.Success,
        title: "Готово",
        message: "Текст типографирован",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Ошибка типографа",
        message,
      });
    }
  }

  return (
    <Form
      navigationTitle='- Это "Типограф"? — Нет, это «Типограф»!'
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Оттипографить"
            onSubmit={onSubmit}
            icon={Icon.Text}
          />
          <Action.CopyToClipboard
            title="Скопировать"
            content={output}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="source"
        title="Текст:"
        value={input}
        onChange={setInput}
        enableMarkdown={false}
        autoFocus
      />
      <Form.TextArea
        id="result"
        title="Результат:"
        value={output}
        onChange={() => {}}
        enableMarkdown={false}
      />
      <Form.Description title="Лимит:" text={`${MAX_LEN} символов`} />
    </Form>
  );
}
