import { Action, ActionPanel, Form, getPreferenceValues, Icon } from "@raycast/api";
import { type ReactElement, useState } from "react";
import { transliterateLatinToCyrillic } from "./translit";

interface Preferences {
  primaryAction: string;
  clearOnAction: boolean;
}

const PRIMARY_ACTIONS = {
  COPY_TO_CLIPBOARD: "copyToClipboard",
  PASTE_TO_ACTIVE_APP: "pasteToActiveApp",
};

// Declared order of actions; the preferred one is moved to the front
const ALL_ACTION_KEYS = [PRIMARY_ACTIONS.COPY_TO_CLIPBOARD, PRIMARY_ACTIONS.PASTE_TO_ACTIVE_APP];

const UI_TEXT = {
  FORM: {
    LATIN_INPUT_TITLE: "Latin Input",
    CYRILLIC_OUTPUT_TITLE: "Cyrillic Output",
  },
  ACTIONS: {
    COPY_TITLE: "Copy to Clipboard",
    PASTE_TITLE: "Paste to Active App",
  },
};

const DEFAULT = {
  PLACEHOLDER: "Privet...",
};

export default function Command() {
  const [input, setInput] = useState("");
  const { primaryAction, clearOnAction } = getPreferenceValues<Preferences>();

  const cyrillicOutput = transliterateLatinToCyrillic(input);
  const hasOutput = cyrillicOutput.length > 0;

  const clearInput = () => {
    setInput("");
  };

  const actionComponents: Record<string, ReactElement> = {
    [PRIMARY_ACTIONS.PASTE_TO_ACTIVE_APP]: (
      <Action.Paste
        key="paste"
        title={UI_TEXT.ACTIONS.PASTE_TITLE}
        icon={Icon.Clipboard}
        content={cyrillicOutput}
        onPaste={() => {
          if (clearOnAction) clearInput();
        }}
      />
    ),
    [PRIMARY_ACTIONS.COPY_TO_CLIPBOARD]: (
      <Action.CopyToClipboard
        key="copy"
        title={UI_TEXT.ACTIONS.COPY_TITLE}
        icon={Icon.Clipboard}
        content={cyrillicOutput}
        onCopy={() => {
          if (clearOnAction) clearInput();
        }}
      />
    ),
  };

  const orderedActionKeys = ALL_ACTION_KEYS.includes(primaryAction)
    ? [primaryAction, ...ALL_ACTION_KEYS.filter((key) => key !== primaryAction)]
    : ALL_ACTION_KEYS;

  return (
    <Form
      actions={hasOutput ? <ActionPanel>{orderedActionKeys.map((key) => actionComponents[key])}</ActionPanel> : null}
    >
      <Form.TextArea
        id="input"
        title={UI_TEXT.FORM.LATIN_INPUT_TITLE}
        placeholder={DEFAULT.PLACEHOLDER}
        value={input}
        onChange={setInput}
      />
      <Form.Description title={UI_TEXT.FORM.CYRILLIC_OUTPUT_TITLE} text={cyrillicOutput} />
    </Form>
  );
}
