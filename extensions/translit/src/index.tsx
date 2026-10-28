import { Action, ActionPanel, AI, environment, Form, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
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
    AI_FIX_TITLE: "Fix Spelling With AI",
  },
  TOASTS: {
    AI_LOADING_TITLE: "Fixing Spelling",
    AI_SUCCESS_TITLE: "Spelling Fixed",
    AI_FAILURE_TITLE: "Failed to Fix Spelling",
  },
};

const DEFAULT = {
  PLACEHOLDER: "Privet...",
};

const buildFixSpellingPrompt = (latinInput: string, cyrillicOutput: string) =>
  `Fix spelling of the Cyrillic transliteration below. It was produced by a Latin-to-Cyrillic phonetic transliteration of the Latin input, so correct scheme mistakes and typos, not style. Return ONLY the corrected Cyrillic text, nothing else. Latin input: ${latinInput}. Cyrillic output: ${cyrillicOutput}.`;

export default function Command() {
  const [input, setInput] = useState("");
  // Corrected text from the AI action, if any; takes precedence over the live transliteration
  const [aiOverride, setAiOverride] = useState<string | null>(null);
  const { primaryAction, clearOnAction } = getPreferenceValues<Preferences>();

  const cyrillicOutput = aiOverride ?? transliterateLatinToCyrillic(input);
  const hasOutput = cyrillicOutput.length > 0;

  const clearInput = () => {
    setInput("");
    setAiOverride(null);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    // Live typing invalidates any AI correction, so stale fixes never stick
    setAiOverride(null);
  };

  const fixSpellingWithAI = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: UI_TEXT.TOASTS.AI_LOADING_TITLE,
    });

    try {
      const prompt = buildFixSpellingPrompt(input, cyrillicOutput);
      const fixed = (await AI.ask(prompt, { creativity: "none" })).trim();
      setAiOverride(fixed);
      toast.style = Toast.Style.Success;
      toast.title = UI_TEXT.TOASTS.AI_SUCCESS_TITLE;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = UI_TEXT.TOASTS.AI_FAILURE_TITLE;
      toast.message = error instanceof Error ? error.message : String(error);
    }
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
      actions={
        hasOutput ? (
          <ActionPanel>
            {orderedActionKeys.map((key) => actionComponents[key])}
            {environment.canAccess(AI) ? (
              <Action title={UI_TEXT.ACTIONS.AI_FIX_TITLE} icon={Icon.Stars} onAction={fixSpellingWithAI} />
            ) : null}
          </ActionPanel>
        ) : null
      }
    >
      <Form.TextArea
        id="input"
        title={UI_TEXT.FORM.LATIN_INPUT_TITLE}
        placeholder={DEFAULT.PLACEHOLDER}
        value={input}
        onChange={handleInputChange}
      />
      <Form.Description title={UI_TEXT.FORM.CYRILLIC_OUTPUT_TITLE} text={cyrillicOutput} />
    </Form>
  );
}
