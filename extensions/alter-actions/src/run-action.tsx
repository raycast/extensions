import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  confirmAlert,
  getApplications,
  getSelectedText,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useEffect, useState } from "react";
import { dispatchAction } from "./dispatch";
import {
  MAX_INPUT_LENGTH,
  STORAGE_KEY,
  SavedAction,
  buildActionUrl,
  escapeMarkdown,
  fencedInputPreview,
  normalizeCallback,
  parseStore,
  removeAction,
  serializeActions,
  upsertAction,
  validateName,
} from "./model";

const CALLBACK_DOCS = "https://docs.alterhq.com/workflows/url-callbacks";
type InputSource = "custom" | "selection" | "clipboard" | "none";

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

function ActionEditor({
  existing,
  actions,
  onSave,
}: {
  existing?: SavedAction;
  actions: SavedAction[];
  onSave: (actions: SavedAction[]) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(existing?.name ?? "");
  const [callback, setCallback] = useState(existing?.callbackUrl ?? "");
  const [nameError, setNameError] = useState<string>();
  const [callbackError, setCallbackError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function save() {
    let checkedName: string;
    let checkedCallback: string;
    try {
      checkedName = validateName(name);
      setNameError(undefined);
    } catch (error) {
      setNameError(errorMessage(error));
      return;
    }
    try {
      checkedCallback = normalizeCallback(callback);
      setCallbackError(undefined);
    } catch (error) {
      setCallbackError(errorMessage(error));
      return;
    }
    setBusy(true);
    try {
      await onSave(
        upsertAction(actions, {
          id: existing?.id ?? randomUUID(),
          name: checkedName,
          callbackUrl: checkedCallback,
        }),
      );
      await showToast({
        style: Toast.Style.Success,
        title: existing ? "Action Updated" : "Action Saved",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Action",
        message: errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form
      navigationTitle={existing ? "Edit Alter Action" : "Add Alter Action"}
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Action"
            icon={Icon.Checkmark}
            onSubmit={save}
          />
          <Action.OpenInBrowser
            title="Open Alter Callback Guide"
            url={CALLBACK_DOCS}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="In Alter, open Action Editor → choose an action → General → URL Callback, then copy its URL. Give it a memorable name here. Saving does not run the action." />
      <Form.TextField
        id="name"
        title="Action Name"
        placeholder="Summarize Text"
        value={name}
        onChange={setName}
        error={nameError}
      />
      <Form.TextField
        id="callbackUrl"
        title="URL Callback"
        placeholder="alter://action/your-action-id"
        value={callback}
        onChange={setCallback}
        error={callbackError}
        info="Only documented Alter action URLs are accepted. Existing example input is removed; you review fresh input before each run."
      />
    </Form>
  );
}

function ActionPreview({
  action,
  input,
  source,
}: {
  action: SavedAction;
  input: string;
  source: InputSource;
}) {
  const [sending, setSending] = useState(false);
  const sourceLabels: Record<InputSource, string> = {
    custom: "Custom text",
    selection: "Selected text",
    clipboard: "Clipboard text",
    none: "No input",
  };

  async function send() {
    if (sending) return;
    setSending(true);
    try {
      await dispatchAction(action.callbackUrl, input, {
        getApplications,
        open,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Opened in Alter",
        message: "Check Alter for the action result.",
      });
      await closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Open Action",
        message: errorMessage(error),
      });
    } finally {
      setSending(false);
    }
  }

  const markdown = [
    `# ${escapeMarkdown(action.name)}`,
    "The text below will be passed to this Alter action. Its effects depend on the action you configured in Alter.",
    "## Input",
    input.length ? fencedInputPreview(input) : "*No input will be sent.*",
  ].join("\n\n");

  return (
    <Detail
      navigationTitle="Review Alter Action"
      isLoading={sending}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Action" text={action.name} />
          <Detail.Metadata.Label
            title="Input Source"
            text={sourceLabels[source]}
          />
          <Detail.Metadata.Label
            title="Characters"
            text={String(input.length)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Callback" text={action.callbackUrl} />
          <Detail.Metadata.Label
            title="Result"
            text="View in Alter after opening"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Send to Alter" icon={Icon.Play} onAction={send} />
          {input.length > 0 && (
            <Action.CopyToClipboard
              title="Copy Reviewed Input"
              content={input}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function PrepareAction({ action }: { action: SavedAction }) {
  const { push } = useNavigation();
  const [source, setSource] = useState<InputSource>("custom");
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function preview() {
    setBusy(true);
    setInputError(undefined);
    try {
      let reviewedInput = input;
      if (source === "selection") reviewedInput = await getSelectedText();
      if (source === "clipboard")
        reviewedInput = (await Clipboard.readText()) ?? "";
      if (source === "none") reviewedInput = "";
      if (
        (source === "selection" || source === "clipboard") &&
        !reviewedInput.trim()
      ) {
        throw new Error(
          `There is no text in the ${source === "selection" ? "current selection" : "clipboard"}. Choose custom text or no input.`,
        );
      }
      buildActionUrl(action.callbackUrl, reviewedInput);
      push(
        <ActionPreview action={action} input={reviewedInput} source={source} />,
      );
    } catch (error) {
      const message = errorMessage(error);
      if (source === "custom") setInputError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Prepare Input",
        message,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form
      navigationTitle={action.name}
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Preview Input"
            icon={Icon.Eye}
            onSubmit={preview}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose what to pass to the action. You will review the exact text before sending it to Alter." />
      <Form.Dropdown
        id="source"
        title="Input Source"
        value={source}
        onChange={(value) => setSource(value as InputSource)}
      >
        <Form.Dropdown.Item
          value="custom"
          title="Custom Text"
          icon={Icon.Text}
        />
        <Form.Dropdown.Item
          value="selection"
          title="Selected Text"
          icon={Icon.TextSelection}
        />
        <Form.Dropdown.Item
          value="clipboard"
          title="Clipboard Text"
          icon={Icon.Clipboard}
        />
        <Form.Dropdown.Item
          value="none"
          title="No Input"
          icon={Icon.MinusCircle}
        />
      </Form.Dropdown>
      {source === "custom" && (
        <Form.TextArea
          id="input"
          title="Input"
          placeholder="Text or prompt to pass to your action"
          value={input}
          onChange={setInput}
          error={inputError}
          info={`Up to ${MAX_INPUT_LENGTH.toLocaleString()} characters; very large encoded URLs may need shorter text.`}
        />
      )}
      {source === "selection" && (
        <Form.Description text="Raycast will read the selected text from the application you were using before opening Raycast. Accessibility permission may be needed." />
      )}
      {source === "clipboard" && (
        <Form.Description text="Raycast will read your current text clipboard when you choose Preview Input." />
      )}
      {source === "none" && (
        <Form.Description text="The callback will run with no input parameter. Alter may use the context configured for this action." />
      )}
    </Form>
  );
}

export default function Command() {
  const [actions, setActions] = useState<SavedAction[]>([]);
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string>();

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const stored = await LocalStorage.getItem(STORAGE_KEY);
        if (mounted)
          setRaw(
            typeof stored === "string"
              ? stored
              : (JSON.stringify(stored) ?? ""),
          );
        if (stored !== undefined && typeof stored !== "string")
          throw new Error("Saved action data must be stored as text.");
        const parsed = parseStore(stored);
        if (mounted) setActions(parsed.actions);
      } catch (error) {
        if (mounted) setStorageError(errorMessage(error));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function persist(next: SavedAction[]) {
    const serialized = serializeActions(next);
    await LocalStorage.setItem(STORAGE_KEY, serialized);
    setActions(next);
    setRaw(serialized);
  }

  async function reset() {
    if (
      !(await confirmAlert({
        title: "Reset Saved Actions?",
        message:
          "This removes only this extension’s saved action configurations. Copy the saved data first if you want to recover it.",
        primaryAction: {
          title: "Reset Saved Actions",
          style: Alert.ActionStyle.Destructive,
        },
      }))
    )
      return;
    try {
      await LocalStorage.removeItem(STORAGE_KEY);
      setActions([]);
      setRaw("");
      setStorageError(undefined);
      await showToast({
        style: Toast.Style.Success,
        title: "Saved Actions Reset",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Reset Actions",
        message: errorMessage(error),
      });
    }
  }

  if (storageError) {
    return (
      <Detail
        markdown={`# Saved Actions Need Attention\n\n${escapeMarkdown(storageError)}\n\nYour saved data has not been changed. Copy it for recovery, or explicitly reset this extension’s saved actions to start again.`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Saved Data for Recovery"
              content={raw}
            />
            <Action
              title="Reset Saved Actions"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={reset}
            />
          </ActionPanel>
        }
      />
    );
  }

  const addAction = loading ? null : (
    <Action.Push
      title="Add Action"
      icon={Icon.Plus}
      target={<ActionEditor actions={actions} onSave={persist} />}
      shortcut={Keyboard.Shortcut.Common.New}
    />
  );
  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search saved Alter actions"
      navigationTitle="Alter Actions"
    >
      <List.EmptyView
        icon={Icon.Bolt}
        title={
          loading ? "Loading Saved Actions" : "Add Your First Alter Action"
        }
        description={
          loading
            ? ""
            : "Copy a URL Callback from an action in Alter, then save it here."
        }
        actions={
          <ActionPanel>
            {addAction}
            <Action.OpenInBrowser
              title="Open Alter Callback Guide"
              url={CALLBACK_DOCS}
            />
          </ActionPanel>
        }
      />
      {actions.map((action) => (
        <List.Item
          key={action.id}
          title={action.name}
          subtitle={new URL(action.callbackUrl).pathname.slice(1)}
          icon={Icon.Bolt}
          actions={
            <ActionPanel>
              <Action.Push
                title="Prepare Action Input"
                icon={Icon.Text}
                target={<PrepareAction action={action} />}
              />
              {addAction}
              <Action.Push
                title="Edit Action"
                icon={Icon.Pencil}
                target={
                  <ActionEditor
                    existing={action}
                    actions={actions}
                    onSave={persist}
                  />
                }
                shortcut={Keyboard.Shortcut.Common.Edit}
              />
              <Action.CopyToClipboard
                title="Copy Action Callback"
                content={action.callbackUrl}
              />
              <Action
                title="Delete Action"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  if (
                    !(await confirmAlert({
                      title: "Delete Saved Action?",
                      message: `Remove “${action.name}” from Raycast? The action in Alter is unaffected.`,
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                      },
                    }))
                  )
                    return;
                  try {
                    await persist(removeAction(actions, action.id));
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Action Deleted",
                    });
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Could Not Delete Action",
                      message: errorMessage(error),
                    });
                  }
                }}
              />
              <Action.OpenInBrowser
                title="Open Alter Callback Guide"
                url={CALLBACK_DOCS}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
