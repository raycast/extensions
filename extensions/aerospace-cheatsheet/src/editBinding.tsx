import { Action, ActionPanel, Alert, Form, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { loadBindings, saveConfig } from "./lib/config";
import { addBinding, removeBinding, updateBinding, verifyEdit } from "./lib/editConfig";
import { keyDisplay, parseKey } from "./lib/keys";
import { lookup } from "./lib/dictionary";

/**
 * Edits one binding, rather than opening the whole file in a text box.
 *
 * Raycast's text area has no monospace font, no syntax highlighting and no line
 * numbers, so a 200-line hand-aligned toml is genuinely unpleasant to edit in it. Two
 * fields for the binding you actually meant to change avoids that entirely, and it
 * cannot corrupt a line you were not touching.
 */

export interface EditTarget {
  mode: string;
  /** Omitted when adding a new binding. */
  key?: string;
  command?: string;
}

export function EditBinding({ target, onSaved }: { target: EditTarget; onSaved?: () => void }) {
  const { pop } = useNavigation();
  const isNew = !target.key;

  const [key, setKey] = useState(target.key ?? "");
  const [command, setCommand] = useState(target.command ?? "");
  const [keyError, setKeyError] = useState<string | undefined>();
  const [commandError, setCommandError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const parsed = key.trim() ? parseKey(key.trim()) : undefined;
  const known = command.trim() ? lookup(command.trim()) : undefined;

  async function submit() {
    const nextKey = key.trim();
    const nextCommand = command.trim();

    if (!nextKey) return setKeyError("A binding needs a key.");
    if (!parsed?.key) return setKeyError("That has modifiers but no key to press.");
    if (!nextCommand) return setCommandError("A binding needs a command.");

    setSaving(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving…" });
    try {
      const { raw } = await loadBindings();
      const edit = isNew
        ? addBinding(raw, target.mode, nextKey, nextCommand)
        : updateBinding(raw, target.mode, target.key as string, { key: nextKey, command: nextCommand });

      // Re-parse and assert the intended outcome before anything reaches disk.
      const check = verifyEdit(edit.raw, target.mode, nextKey, nextCommand);
      if (!check.ok) throw new Error(check.reason);

      const result = await saveConfig(edit.raw);
      // A save that AeroSpace did not reload is not a failure, but it is not success
      // either: the binding will not work until it reloads, and saying nothing would
      // leave the user pressing a key that does nothing.
      toast.style = result.applied ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = result.applied ? edit.summary : "Saved, but not applied";
      toast.message = result.warning ?? keyDisplay(nextKey);
      onSaved?.();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Nothing was saved";
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const confirmed = await confirmAlert({
      title: `Remove ${keyDisplay(target.key as string)}?`,
      message: `This deletes the line from [mode.${target.mode}.binding] in your config.`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Removing…" });
    try {
      const { raw } = await loadBindings();
      const edit = removeBinding(raw, target.mode, target.key as string);
      const check = verifyEdit(edit.raw, target.mode, target.key as string, null);
      if (!check.ok) throw new Error(check.reason);

      const result = await saveConfig(edit.raw);
      toast.style = result.applied ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = result.applied ? edit.summary : "Removed, but not applied";
      if (result.warning) toast.message = result.warning;
      onSaved?.();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Nothing was removed";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <Form
      isLoading={saving}
      navigationTitle={isNew ? "Add Binding" : `Edit ${keyDisplay(target.key as string)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isNew ? "Add Binding" : "Save Binding"} icon={Icon.Check} onSubmit={submit} />
          {!isNew && (
            <Action
              title="Remove Binding"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={remove}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description title="Mode" text={target.mode} />

      <Form.TextField
        id="key"
        title="Key"
        placeholder="ctrl-alt-cmd-l"
        value={key}
        error={keyError}
        onChange={(v) => {
          setKey(v);
          setKeyError(undefined);
        }}
        info="Written the way AeroSpace writes it: modifiers and the key joined by hyphens."
      />
      {parsed?.display && <Form.Description title="Reads as" text={parsed.display} />}

      <Form.TextField
        id="command"
        title="Command"
        placeholder="join-with right"
        value={command}
        error={commandError}
        onChange={(v) => {
          setCommand(v);
          setCommandError(undefined);
        }}
        info="An AeroSpace command. Separate a sequence with a semicolon; it is saved as a toml array."
      />
      {known && (
        <Form.Description title="Recognized as" text={known.entry.label.replace(/\$1/, known.match[1] ?? "")} />
      )}

      <Form.Separator />
      <Form.Description
        title="Before saving"
        text={
          "The change is re-parsed, then applied and checked with reload-config. If AeroSpace rejects it your config is put back exactly as it was."
        }
      />
    </Form>
  );
}
