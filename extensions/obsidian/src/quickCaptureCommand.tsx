import { Action, ActionPanel, closeMainWindow, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { CaptureValues, saveQuickCapture } from "./api/quickCapture.service";
import { Obsidian } from "@/obsidian";

export default function QuickCaptureCommand() {
  const preferences = getPreferenceValues<Preferences.QuickCaptureCommand>();
  const [type, setType] = useState<CaptureValues["type"]>("daily");

  async function save(values: CaptureValues) {
    try {
      const vaults = await Obsidian.getVaultsFromPreferencesOrObsidianJson();
      const vault = preferences.vaultName
        ? vaults.find((candidate) => candidate.name === preferences.vaultName)
        : vaults[0];

      if (!vault) {
        throw new Error("Obsidian vault not found");
      }

      await saveQuickCapture(vault.path, values, preferences);

      await showToast({ style: Toast.Style.Success, title: "Saved to Obsidian" });
      await closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't save capture",
        message: error instanceof Error ? error.message : "Please check the capture file paths.",
      });
    }
  }

  return (
    <Form
      navigationTitle="Quick Capture"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Type" value={type} onChange={(value) => setType(value as CaptureValues["type"])}>
        <Form.Dropdown.Item value="daily" title="Daily Note" />
        <Form.Dropdown.Item value="todo" title="To Do" />
        <Form.Dropdown.Item value="shopping" title="Shopping" />
      </Form.Dropdown>
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Write something to save"
        info="Each save creates one item. Additional lines continue that item."
        autoFocus
      />
    </Form>
  );
}
