import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { newWindow, renameWindow } from "../lib/tmux";
import { toastError } from "../lib/ui";

export function RenameWindowForm({
  sessionId,
  sessionName,
  windowIndex,
  currentName,
  onDone,
}: {
  sessionId: string;
  sessionName: string;
  windowIndex: number;
  currentName: string;
  onDone: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty");
      return;
    }
    try {
      await renameWindow(sessionId, windowIndex, trimmed);
      await showToast({
        style: Toast.Style.Success,
        title: `Renamed window ${windowIndex} → ${trimmed}`,
      });
      await onDone();
      pop();
    } catch (e) {
      await toastError("Rename failed", e);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            icon={Icon.Pencil}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="New name"
        value={name}
        onChange={(v) => {
          setName(v);
          setError(undefined);
        }}
        error={error}
        autoFocus
      />
      <Form.Description
        text={`Renaming window ${windowIndex} in session "${sessionName}"`}
      />
    </Form>
  );
}

export function NewWindowForm({
  sessionId,
  sessionName,
  onDone,
}: {
  sessionId: string;
  sessionName: string;
  onDone: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [cwd, setCwd] = useState<string[]>([]);

  const submit = async () => {
    try {
      await newWindow(
        sessionId,
        name.trim() || undefined,
        cwd[0]?.trim() || undefined,
      );
      await showToast({
        style: Toast.Style.Success,
        title: name.trim()
          ? `Created window "${name.trim()}"`
          : "Created window",
      });
      await onDone();
      pop();
    } catch (e) {
      await toastError("Create window failed", e);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create"
            icon={Icon.Plus}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Window name"
        placeholder="Leave blank to auto-name from running command"
        value={name}
        onChange={setName}
        autoFocus
      />
      <Form.FilePicker
        id="cwd"
        title="Start directory"
        value={cwd}
        onChange={setCwd}
        canChooseFiles={false}
        canChooseDirectories={true}
        allowMultipleSelection={false}
        showHiddenFiles={false}
      />
      <Form.Description
        text={`Creating a new window in session "${sessionName}". The new window is created detached (-d) so the session's current window does not change; use Switch to Window afterwards if you want to land on it.`}
      />
    </Form>
  );
}
