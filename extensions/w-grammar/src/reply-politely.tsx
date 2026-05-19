import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getPreferenceValues,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { GoogleGenAI } from "@google/genai";
import { useEffect, useState } from "react";

interface Preferences {
  geminiApiKey: string;
  model: string;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export default function Command() {
  const [selectedMessage, setSelectedMessage] = useState("");
  const [isLoadingSelectedText, setIsLoadingSelectedText] = useState(true);

  useEffect(() => {
    async function loadSelectedText() {
      try {
        const text = await getSelectedText();
        setSelectedMessage(text);
      } catch {
        setSelectedMessage("");
      } finally {
        setIsLoadingSelectedText(false);
      }
    }

    loadSelectedText();
  }, []);

  async function handleSubmit(values: {
    intent: string;
    tone: string;
    length: string;
  }) {
    if (!selectedMessage.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Не удалось получить выделенное сообщение",
        message: "Сначала выдели сообщение, на которое хочешь ответить",
      });

      return;
    }

    if (!values.intent.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Напиши, что примерно хочешь ответить",
      });

      return;
    }

    const preferences = getPreferenceValues<Preferences>();

    const ai = new GoogleGenAI({
      apiKey: preferences.geminiApiKey,
    });

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Пишу ответ...",
      });

      const prompt = `You are a polite reply writing assistant.

Your task:
Write a natural, polite, grammatically correct reply to the selected message.

Rules:
- Use the same language as the user's rough reply idea, unless the idea is too short or unclear; then use the language of the selected message.
- Preserve the user's intention.
- Make the reply sound natural, respectful, and clear.
- Do not be overly formal unless requested.
- Do not add facts, promises, excuses, names, dates, or details that were not provided.
- Do not include greetings or sign-offs unless they are appropriate for the context.
- Return only the final reply text.
- No explanations, no comments, no markdown.

Tone: ${values.tone}
Length: ${values.length}

---SELECTED MESSAGE START---
${selectedMessage}
---SELECTED MESSAGE END---

---USER ROUGH REPLY IDEA START---
${values.intent}
---USER ROUGH REPLY IDEA END---`;

      const response = await ai.models.generateContent({
        model: preferences.model,
        contents: prompt,
        config: {
          temperature: 0.3,
        },
      });

      const reply = response.text?.trim();

      if (!reply) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Gemini не вернул ответ",
        });

        return;
      }

      await Clipboard.paste(reply);
      await showHUD("Ответ вставлен");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Ошибка",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <Form
      isLoading={isLoadingSelectedText}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Reply" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="intent"
        title="Что ответить"
        placeholder="Например: скажи, что я смогу отправить это завтра утром"
      />

      <Form.Dropdown id="tone" title="Тон" defaultValue="polite">
        <Form.Dropdown.Item value="polite" title="Polite" />
        <Form.Dropdown.Item value="friendly" title="Friendly" />
        <Form.Dropdown.Item value="professional" title="Professional" />
        <Form.Dropdown.Item value="warm" title="Warm" />
        <Form.Dropdown.Item value="firm" title="Firm but polite" />
      </Form.Dropdown>

      <Form.Dropdown id="length" title="Длина" defaultValue="normal">
        <Form.Dropdown.Item value="very short" title="Very Short" />
        <Form.Dropdown.Item value="short" title="Short" />
        <Form.Dropdown.Item value="normal" title="Normal" />
        <Form.Dropdown.Item value="detailed" title="Detailed" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description
        title="Выделенное сообщение"
        text={
          selectedMessage.trim()
            ? selectedMessage.length > 800
              ? selectedMessage.slice(0, 800) + "..."
              : selectedMessage
            : "Сообщение не найдено. Сначала выдели текст, потом запусти команду."
        }
      />
    </Form>
  );
}
