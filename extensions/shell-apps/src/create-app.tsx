import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { useState } from "react";
import { APP_ICON_NAMES, iconByName } from "./lib/icons";
import { getApps, upsertApp } from "./lib/store";
import type { ShellApp, TerminalKind } from "./lib/types";

interface Props {
  app?: ShellApp;
  onSaved?: () => Promise<void> | void;
}

export default function CreateAppForm({ app, onSaved }: Props) {
  const { pop } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const isEditing = !!app;

  const [name, setName] = useState(app?.name ?? "");
  const [command, setCommand] = useState(app?.command ?? "");
  const [terminal, setTerminal] = useState<string>(app?.terminal ?? preferences.defaultTerminal ?? "powershell");
  const [workingDirectory, setWorkingDirectory] = useState(app?.workingDirectory ?? "");
  const [keepOpen, setKeepOpen] = useState<boolean>(app?.keepOpen ?? preferences.defaultKeepOpen ?? true);
  const [runAsAdmin, setRunAsAdmin] = useState<boolean>(app?.runAsAdmin ?? false);
  const [icon, setIcon] = useState<string>(app?.icon ?? "Terminal");

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }
    if (!command.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Command is required" });
      return;
    }

    const now = Date.now();
    const entryName = name.trim();
    const entryCommand = command.trim();
    const entryWorkingDirectory = workingDirectory.trim();

    const duplicate = (await getApps()).find(
      (item) => item.id !== app?.id && item.name.toLowerCase() === entryName.toLowerCase(),
    );
    if (duplicate) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name already used",
        message: `A shell app named "${duplicate.name}" already exists. Quicklinks require unique names.`,
      });
      return;
    }

    if (entryWorkingDirectory && !existsSync(entryWorkingDirectory)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Working directory not found",
        message: `"${entryWorkingDirectory}" does not exist.`,
      });
      return;
    }

    const entry: ShellApp = {
      id: app?.id ?? randomUUID(),
      name: entryName,
      command: entryCommand,
      terminal: terminal as TerminalKind,
      workingDirectory: entryWorkingDirectory || undefined,
      keepOpen,
      runAsAdmin,
      icon,
      createdAt: app?.createdAt ?? now,
      updatedAt: now,
    };

    await upsertApp(entry);
    await onSaved?.();
    await showHUD(isEditing ? "Shell app updated" : "Shell app created");
    if (!isEditing) {
      await showToast({
        style: Toast.Style.Success,
        title: "Created",
        message: "Now pin it in Raycast: open Shell Apps and use Create Quicklink on your shortcut.",
      });
    }
    pop();
  }

  return (
    <Form
      navigationTitle={isEditing ? "Edit Shell App" : "Create Shell App"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Save Changes" : "Create Shell App"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My App"
        value={name}
        onChange={setName}
        info="The display name of your shortcut. Used for the Quicklink name."
      />
      <Form.TextField
        id="command"
        title="Command"
        placeholder="npm run build"
        value={command}
        onChange={setCommand}
        info="The shell command to run. Resolved with your user PATH."
      />
      <Form.Dropdown
        id="terminal"
        title="Terminal"
        value={terminal}
        onChange={setTerminal}
        info="Terminal used to launch the command in a new window."
      >
        <Form.Dropdown.Item value="powershell" title="PowerShell" icon={Icon.Terminal} />
        <Form.Dropdown.Item value="powershell7" title="PowerShell 7" icon={Icon.Terminal} />
        <Form.Dropdown.Item value="cmd" title="Command Prompt" icon={Icon.Terminal} />
        <Form.Dropdown.Item value="wt" title="Windows Terminal" icon={Icon.Terminal} />
      </Form.Dropdown>
      <Form.Dropdown id="icon" title="Icon" value={icon} onChange={setIcon}>
        {APP_ICON_NAMES.map((name) => (
          <Form.Dropdown.Item key={name} value={name} title={name} icon={iconByName(name)} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="workingDirectory"
        title="Working Directory"
        placeholder="C:\\Users\\you"
        value={workingDirectory}
        onChange={setWorkingDirectory}
        info="Optional. The directory the command runs in."
      />
      <Form.Checkbox
        id="keepOpen"
        label="Keep the terminal window open after the command exits"
        value={keepOpen}
        onChange={setKeepOpen}
      />
      <Form.Checkbox
        id="runAsAdmin"
        label="Run as administrator (triggers a UAC prompt)"
        value={runAsAdmin}
        onChange={setRunAsAdmin}
      />
    </Form>
  );
}
