import { Action, ActionPanel, Clipboard, Form, showHUD } from "@raycast/api";
import { useState } from "react";
import { transformText } from "./utils/transformText";
import { Language } from "./data";

export default function main() {
  const [text, setText] = useState<string>("");
  const [switchFrom, setSwitchFrom] = useState<Language>("eng");
  const [switchTo, setSwitchTo] = useState<Language>("ukr");

  const [textError, setTextError] = useState<string | undefined>("");
  const [langError, setLangError] = useState<string | undefined>("");

  async function handlePaste(text: string) {
    if (text.length === 0) {
      setTextError("Text is required");
      return;
    }

    const transformedText = transformText({ input: text, switchFrom, switchTo });
    await Clipboard.paste(transformedText);
    await showHUD("Transformed text pasted to active app");
  }

  async function handleCopy(text: string) {
    if (text.length === 0) {
      setTextError("Text is required");
      return;
    }

    const transformedText = transformText({ input: text, switchFrom, switchTo });
    await Clipboard.copy(transformedText);
    await showHUD("Transformed text copied to clipboard");
  }

  function onChangeText(text: string) {
    setText(text);
    dropTextErrorIfNeeded();
  }

  function onChangeSwitchFrom(lang: Language) {
    setSwitchFrom(lang);
    dropLangErrorIfNeeded();
  }

  function onChangeSwitchTo(lang: Language) {
    setSwitchTo(lang);
    dropLangErrorIfNeeded();
  }

  function dropTextErrorIfNeeded() {
    if (textError && textError.length > 0) {
      setTextError(undefined);
    }
  }

  function dropLangErrorIfNeeded() {
    if (langError && langError.length > 0) {
      setLangError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Paste To Active App" onSubmit={() => handlePaste(text)} />
          <Action.SubmitForm
            title="Copy To Clipboard"
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            onSubmit={() => handleCopy(text)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Enter text here"
        value={text}
        error={textError}
        onChange={onChangeText}
        onBlur={(event) => {
          if (event.target.value?.length === 0) {
            setTextError("Text is required");
          } else {
            dropTextErrorIfNeeded();
          }
        }}
      />

      <Form.Dropdown
        id="langFrom"
        title="Switch from"
        value={switchFrom}
        error={langError}
        onChange={(lang: string) => onChangeSwitchFrom(lang as Language)}
        onBlur={(event) => {
          if (event.target.value === switchTo) {
            setLangError("Languages should be different");
          } else {
            dropLangErrorIfNeeded();
          }
        }}
      >
        <Form.Dropdown.Item value="eng" title="🇬🇧 English" />
        <Form.Dropdown.Item value="ukr" title="🇺🇦 Ukrainian" />
      </Form.Dropdown>

      <Form.Dropdown
        id="langTo"
        title="Switch to"
        value={switchTo}
        error={langError}
        onChange={(lang: string) => onChangeSwitchTo(lang as Language)}
        onBlur={(event) => {
          if (event.target.value === switchFrom) {
            setLangError("Languages should be different");
          } else {
            dropLangErrorIfNeeded();
          }
        }}
      >
        <Form.Dropdown.Item value="eng" title="🇬🇧 English" />
        <Form.Dropdown.Item value="ukr" title="🇺🇦 Ukrainian" />
      </Form.Dropdown>
    </Form>
  );
}
