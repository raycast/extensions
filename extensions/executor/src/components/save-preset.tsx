import { WorkspaceAction } from "./workspace-command";
import { workspaceTitle } from "../lib/workspaces";
import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useRef, useState } from "react";
import { toolLabel } from "../lib/format";
import { type SavedTool, saveTool } from "../lib/saved-tools";
import { savedToolFingerprint, updateExecutorSavedTool } from "../lib/saved-tools-ai";
import { parseArgumentsJson } from "../lib/ai-tools";
import type { ToolSummary } from "../lib/types";

export function SavePreset({ tool, args }: { tool: ToolSummary; args: Record<string, unknown> }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(toolLabel(tool.name));
  const [error, setError] = useState<string>();
  const pending = useRef(false);
  return (
    <Form
      navigationTitle={workspaceTitle("Save Input Preset")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Preset"
            icon={Icon.Check}
            onSubmit={async () => {
              if (!name.trim()) {
                setError("Enter a name.");
                return;
              }
              if (pending.current) return;
              pending.current = true;
              try {
                await saveTool({ id: randomUUID(), title: name.trim(), tool, args });
                await showToast({
                  style: Toast.Style.Success,
                  title: "Preset Saved",
                  message: "Open Saved Tools to use it again.",
                });
                pop();
              } catch (error) {
                await showFailureToast(error, { title: "Could Not Save Preset" });
              } finally {
                pending.current = false;
              }
            }}
          />
          <WorkspaceAction />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        value={name}
        placeholder="Preset name"
        onBlur={(event) => setError(event.target.value?.trim() ? undefined : "Enter a name.")}
        error={error}
        onChange={(value) => {
          setName(value);
          setError(undefined);
        }}
      />
      <Form.Description
        title="Storage"
        text="Inputs are saved on this Mac for this Executor account. Avoid saving passwords, tokens, or sensitive records."
      />
    </Form>
  );
}

export function EditSavedTool({ item, onSaved }: { item: SavedTool; onSaved: () => Promise<unknown> }) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(item.title);
  const [inputs, setInputs] = useState(JSON.stringify(item.args ?? {}, null, 2));
  const [titleError, setTitleError] = useState<string>();
  const [inputsError, setInputsError] = useState<string>();
  const pending = useRef(false);
  const fingerprint = useRef(savedToolFingerprint(item));
  async function submit() {
    if (!title.trim()) {
      setTitleError("Enter a name.");
      return;
    }
    if (item.args) {
      try {
        parseArgumentsJson(inputs);
      } catch (error) {
        setInputsError((error as Error).message);
        return;
      }
    }
    if (pending.current) return;
    pending.current = true;
    try {
      await updateExecutorSavedTool({
        savedToolId: item.id,
        savedToolFingerprint: fingerprint.current,
        title,
        ...(item.args ? { argumentsJson: inputs } : {}),
      });
      await onSaved();
      await showToast({ style: Toast.Style.Success, title: "Saved Tool Updated" });
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Update Saved Tool" });
    } finally {
      pending.current = false;
    }
  }
  return (
    <Form
      navigationTitle={workspaceTitle("Edit Saved Tool")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={submit} />
          <WorkspaceAction />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Name"
        value={title}
        placeholder="Saved tool name"
        onBlur={(event) => setTitleError(event.target.value?.trim() ? undefined : "Enter a name.")}
        error={titleError}
        onChange={(value) => {
          setTitle(value);
          setTitleError(undefined);
        }}
      />
      {item.args && (
        <Form.TextArea
          id="inputs"
          title="Inputs"
          placeholder="Tool inputs as a JSON object"
          value={inputs}
          error={inputsError}
          onChange={(value) => {
            setInputs(value);
            setInputsError(undefined);
          }}
        />
      )}
    </Form>
  );
}
