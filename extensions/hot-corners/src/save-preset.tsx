import { Action, ActionPanel, closeMainWindow, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { addPreset, readHotCornerSettings } from "./lib/hot-corners";

export default function SavePresetCommand() {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Preset"
            onSubmit={async (values: { name: string }) => {
              const trimmed = values.name?.trim() ?? "";
              if (!trimmed) {
                setNameError("Name is required");
                return false;
              }
              try {
                const settings = readHotCornerSettings();
                addPreset(trimmed, settings);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Preset saved",
                  message: trimmed,
                });
                await popToRoot({ clearSearchBar: true });
                await closeMainWindow();
              } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not save preset",
                  message,
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g. Work, Gaming"
        value={name}
        onChange={(v) => {
          setName(v);
          setNameError(undefined);
        }}
        error={nameError}
        autoFocus
      />
      <Form.Description text="Save a named preset of your current hot corner actions and modifiers." />
    </Form>
  );
}
