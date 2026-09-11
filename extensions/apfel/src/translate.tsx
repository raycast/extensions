import { Action, ActionPanel, Form, Keyboard, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getSupportedLanguages } from "./api/apfel/supported-languages";
import { apfelTranslate } from "./api/apfel/translate";
import { ApfelGuard } from "./components/ApfelGuard";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useHistory } from "./hooks/useHistory";

export default function Command() {
  return (
    <ApfelGuard>
      <Translate />
    </ApfelGuard>
  );
}

function Translate() {
  const history = useHistory();

  const [text, setText] = useState("");
  const [from, setFrom] = useState("auto");
  const [to, setTo] = useState("");

  const debouncedText = useDebouncedValue(text, 500);

  const { isLoading: languagesLoading, data: supportedLanguages } = usePromise(async () => {
    return await getSupportedLanguages();
  });

  const { isLoading, data: translated } = usePromise(
    async (text: string, from: string, to: string) => {
      if (!text.trim() || !to.trim()) return "";

      await showToast({ style: Toast.Style.Animated, title: "Getting your translation..." });

      const translated = await apfelTranslate(from, to, text);
      await history.add({
        id: uuidv4(),
        question: `Translate: ${text}`,
        created_at: new Date().toISOString(),
        answer: translated,
        metadata: [
          {
            title: "From",
            text: from === "auto" ? "Auto-detect" : (supportedLanguages?.find((l) => l.code === from)?.name ?? ""),
          },
          {
            title: "To",
            text: supportedLanguages?.find((l) => l.code === to)?.name ?? "",
          },
        ].filter((i) => i.text),
      });

      await showToast({ style: Toast.Style.Success, title: "Got your translation!" });

      return translated;
    },
    [debouncedText, from, to],
  );

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="General">
            {!isLoading && translated && (
              <Action.CopyToClipboard
                title="Copy Translation"
                content={translated ?? ""}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            )}

            {text && (
              <Action.CopyToClipboard title="Copy Original" content={text} shortcut={Keyboard.Shortcut.Common.Pin} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Text" value={text} onChange={setText} />
      <Form.Dropdown id="from" isLoading={languagesLoading} title="From" value={from} onChange={setFrom} storeValue>
        <Form.Dropdown.Item value="auto" title="Auto-detect" />

        {supportedLanguages?.map((language) => (
          <Form.Dropdown.Item key={language.code} value={language.code} title={language.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="to" isLoading={languagesLoading} title="To" value={to} onChange={setTo} storeValue>
        {supportedLanguages?.map((language) => (
          <Form.Dropdown.Item key={language.code} value={language.code} title={language.name} />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        id="result"
        title="Translation"
        value={translated ?? ""}
        placeholder="Translation will appear here…"
        onChange={() => {}}
      />
    </Form>
  );
}
