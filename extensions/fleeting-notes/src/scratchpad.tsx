import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Detail,
  Form,
  Icon,
  Toast,
  closeMainWindow,
  confirmAlert,
  environment,
  getPreferenceValues,
  showToast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useRef, useState } from "react";
import { ScratchpadState, ScratchpadStore, appendText } from "./lib/storage";

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The scratchpad could not be saved.";
}

export default function Scratchpad() {
  const store = useRef(new ScratchpadStore(environment.supportPath)).current;
  const [initial] = useState(() => {
    try {
      return { state: store.read(), error: "" };
    } catch (error) {
      return { state: null, error: errorMessage(error) };
    }
  });
  if (!initial.state) {
    return (
      <Detail
        markdown={`# Could Not Open Scratchpad\n\n${initial.error}\n\nThe saved file has been left untouched.`}
        actions={
          <ActionPanel>
            <Action.ShowInFinder title="Show Storage Folder" path={environment.supportPath} />
          </ActionPanel>
        }
      />
    );
  }
  return <Editor store={store} initial={initial.state} />;
}

function Editor({ store, initial }: { store: ScratchpadStore; initial: ScratchpadState }) {
  const [state, setState] = useState(initial);
  const saved = useRef(initial);
  const [text, setText] = useState(initial.current.text);
  const latestText = useRef(initial.current.text);
  const [saveError, setSaveError] = useState<string>();
  const textArea = useRef<Form.TextArea>(null);
  const { markdown } = getPreferenceValues<Preferences.Scratchpad>();

  function accept(next: ScratchpadState) {
    saved.current = next;
    setState(next);
    setSaveError(undefined);
  }

  function save(value: string): boolean {
    latestText.current = value;
    setText(value);
    try {
      accept(store.save(value, saved.current.revision));
      return true;
    } catch (error) {
      setSaveError(errorMessage(error));
      return false;
    }
  }

  async function close() {
    if (save(latestText.current)) await closeMainWindow();
    else await showFailureToast("Copy it before closing.", { title: "Text has not been saved" });
  }

  async function startNew() {
    if (!latestText.current) return;
    const confirmed = await confirmAlert({
      title: "Start a New Scratchpad?",
      message: state.previous
        ? "Your current pad will become the previous pad, replacing the older previous pad. Copy anything you want to keep first."
        : "Your current pad will be kept as the previous pad. You can restore it from the Action menu.",
      primaryAction: {
        title: "Start New",
        style: state.previous ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });
    if (!confirmed || !save(latestText.current)) return;
    try {
      const next = store.startNew(saved.current.revision);
      accept(next);
      latestText.current = next.current.text;
      setText(next.current.text);
      textArea.current?.focus();
    } catch (error) {
      setSaveError(errorMessage(error));
    }
  }

  async function restorePrevious() {
    if (!save(latestText.current)) return;
    try {
      const next = store.restorePrevious(saved.current.revision);
      accept(next);
      latestText.current = next.current.text;
      setText(next.current.text);
      textArea.current?.focus();
    } catch (error) {
      setSaveError(errorMessage(error));
    }
  }

  async function appendClipboard() {
    try {
      const clipboard = await Clipboard.readText();
      if (!clipboard) {
        await showToast({ style: Toast.Style.Failure, title: "No text on the clipboard" });
        return;
      }
      save(appendText(latestText.current, clipboard));
      textArea.current?.focus();
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Read Clipboard" });
    }
  }

  return (
    <Form
      enableDrafts={false}
      actions={
        <ActionPanel>
          <Action title="Save and Close" icon={Icon.Checkmark} onAction={close} />
          <Action.CopyToClipboard title="Copy Scratchpad" content={text} />
          <Action
            title="Append Clipboard"
            icon={Icon.Clipboard}
            onAction={appendClipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          />
          <ActionPanel.Section title="Scratchpad">
            <Action
              title="Start New Scratchpad"
              icon={Icon.Plus}
              style={state.previous ? Action.Style.Destructive : Action.Style.Regular}
              onAction={startNew}
              shortcut={Keyboard.Shortcut.Common.New}
            />
            {state.previous !== null ? (
              <Action
                title="Swap with Previous Scratchpad"
                icon={Icon.ArrowCounterClockwise}
                onAction={restorePrevious}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
            ) : null}
            <Action.ShowInFinder title="Show Storage Folder" path={environment.supportPath} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="scratchpad"
        title=""
        placeholder="Type anything. Close and reopen to resume."
        value={text}
        onChange={save}
        autoFocus
        enableMarkdown={markdown}
        error={saveError}
        ref={textArea}
      />
      <Form.Description
        title=""
        text={
          saveError
            ? "Not saved — copy your text before closing."
            : `${countWords(text)} words · ${text.length} characters · Saved as you type. ⌘↩ saves and closes.`
        }
      />
    </Form>
  );
}
