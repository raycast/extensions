import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  getSelectedText,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { polishText, PolishError } from "./lib/polish";
import { Provider } from "./lib/providers";

const MAX_INPUT_CHARS = 8000;

interface Preferences {
  provider: Provider;
  apiKey: string;
}

type State =
  | { phase: "loading" }
  | { phase: "need-input"; initialText: string }
  | { phase: "polishing" }
  | { phase: "result"; original: string; polished: string }
  | { phase: "error"; message: string; showPreferencesAction: boolean };

export default function Command() {
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.apiKey) {
      setState({
        phase: "error",
        message: "No API key configured. Add one in extension preferences.",
        showPreferencesAction: true,
      });
      return;
    }

    let selected = "";
    try {
      selected = await getSelectedText();
    } catch {
      selected = "";
    }

    setState({ phase: "need-input", initialText: selected.trim() });
  }

  async function runPolish(text: string) {
    if (text.length > MAX_INPUT_CHARS) {
      setState({
        phase: "error",
        message: `Text is too long to polish (max ${MAX_INPUT_CHARS} characters).`,
        showPreferencesAction: false,
      });
      return;
    }

    setState({ phase: "polishing" });

    const preferences = getPreferenceValues<Preferences>();
    try {
      const polished = await polishText(
        text,
        preferences.provider,
        preferences.apiKey,
      );
      setState({ phase: "result", original: text, polished });
    } catch (error) {
      const message =
        error instanceof PolishError
          ? error.message
          : "Something went wrong while polishing the text.";
      const showPreferencesAction =
        error instanceof PolishError && error.isAuthError;
      setState({ phase: "error", message, showPreferencesAction });
    }
  }

  if (state.phase === "loading" || state.phase === "polishing") {
    return (
      <Detail
        isLoading
        markdown={state.phase === "polishing" ? "Polishing..." : ""}
      />
    );
  }

  if (state.phase === "need-input") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Polish"
              onSubmit={(values: { text: string }) => {
                if (values.text.trim().length === 0) {
                  void showToast({
                    style: Toast.Style.Failure,
                    title: "Enter some text to polish",
                  });
                  return;
                }
                void runPolish(values.text);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id="text"
          title="Text"
          placeholder="Enter the text you want to polish"
          defaultValue={state.initialText}
        />
      </Form>
    );
  }

  if (state.phase === "error") {
    return (
      <Detail
        markdown={`## Error\n\n${state.message}`}
        actions={
          <ActionPanel>
            {state.showPreferencesAction && (
              <Action
                title="Open Extension Preferences"
                onAction={openExtensionPreferences}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      markdown={`## Original\n\n${state.original}\n\n## Polished\n\n${state.polished}`}
      actions={
        <ActionPanel>
          <Action.Paste
            title="Replace Original Text"
            content={state.polished}
          />
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            content={state.polished}
          />
        </ActionPanel>
      }
    />
  );
}
