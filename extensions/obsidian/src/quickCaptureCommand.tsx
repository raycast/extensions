import { Action, ActionPanel, closeMainWindow, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { promises as fs } from "fs";
import path from "path";
import { useState } from "react";
import { applyTemplates } from "./api/templating/templating.service";
import { Obsidian } from "@/obsidian";

type CaptureType = "daily" | "todo" | "shopping";

interface FormValues {
  type: CaptureType;
  text: string;
}

function preferencePath(type: CaptureType, preferences: Preferences.QuickCaptureCommand): string | undefined {
  switch (type) {
    case "daily":
      return preferences.dailyNotePath;
    case "todo":
      return preferences.todoNotePath;
    case "shopping":
      return preferences.shoppingNotePath;
  }
}

async function resolveNotePath(vaultPath: string, relativePath: string): Promise<string> {
  if (path.isAbsolute(relativePath)) {
    throw new Error("The capture file path must be relative to the selected vault.");
  }

  const vault = await fs.realpath(vaultPath);
  const note = await fs.realpath(path.resolve(vault, relativePath));
  const relative = path.relative(vault, note);

  if (relative === "" || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("The capture file must stay inside the selected vault.");
  }

  return note;
}

export default function QuickCaptureCommand() {
  const preferences = getPreferenceValues<Preferences.QuickCaptureCommand>();
  const [type, setType] = useState<CaptureType>("daily");

  async function save(values: FormValues) {
    const vaults = await Obsidian.getVaultsFromPreferencesOrObsidianJson();
    const vault = preferences.vaultName
      ? vaults.find((candidate) => candidate.name === preferences.vaultName)
      : vaults[0];

    if (!vault) {
      await showToast({ style: Toast.Style.Failure, title: "Obsidian vault not found" });
      return;
    }

    try {
      const configuredPath = preferencePath(values.type, preferences);
      if (!configuredPath?.trim()) {
        throw new Error(
          `Configure a ${
            values.type === "todo" ? "To Do" : values.type === "shopping" ? "Shopping" : "Daily Note"
          } path first.`
        );
      }

      if (!values.text.trim()) {
        throw new Error("Enter text before saving.");
      }

      const expandedPath = await applyTemplates("", configuredPath);
      const notePath = await resolveNotePath(vault.path, expandedPath);
      const content = await applyTemplates(values.text.trim());
      const entry = values.type === "todo" ? `- [ ] ${content}` : `- ${content}`;

      await fs.appendFile(notePath, `\n${entry}`);

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
      <Form.Dropdown id="type" title="Type" value={type} onChange={(value) => setType(value as CaptureType)}>
        <Form.Dropdown.Item value="daily" title="Daily Note" />
        <Form.Dropdown.Item value="todo" title="To Do" />
        <Form.Dropdown.Item value="shopping" title="Shopping" />
      </Form.Dropdown>
      <Form.TextArea id="text" title="Text" placeholder="Write something to save" autoFocus />
    </Form>
  );
}
