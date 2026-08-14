import {
  Action,
  ActionPanel,
  Form,
  Icon,
  closeMainWindow,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import {
  type Destination,
  type InputMode,
  type LineFormat,
  type Position,
  type Route,
  type Section,
  saveInput,
} from "./lib/storage";

type PreferenceValue = string | boolean | undefined;

type Preferences = {
  [key: string]: PreferenceValue;
  vaultPath?: string;
  dailyNoteFolder?: string;
  dailyNoteFileFormat?: string;
  openObsidianAfterSave?: boolean;
  noteDestination?: string;
  noteFilePath?: string;
  notePosition?: string;
  noteSection?: string;
  noteHeading?: string;
  noteLineFormat?: string;
  noteAddCurrentTime?: boolean;
  taskDestination?: string;
  taskFilePath?: string;
  taskPosition?: string;
  taskSection?: string;
  taskHeading?: string;
  taskLineFormat?: string;
  taskAddCurrentTime?: boolean;
  shoppingDestination?: string;
  shoppingFilePath?: string;
  shoppingPosition?: string;
  shoppingSection?: string;
  shoppingHeading?: string;
  shoppingLineFormat?: string;
  shoppingAddCurrentTime?: boolean;
};

const MODE_LABELS: Record<InputMode, string> = {
  note: "Daily Note",
  task: "To Do",
  shopping: "Shopping",
};

const DEFAULT_ROUTES: Record<InputMode, Route> = {
  note: {
    destination: "daily-note",
    filePath: "",
    position: "append",
    section: "none",
    heading: "",
    lineFormat: "bullet",
    addCurrentTime: false,
  },
  task: {
    destination: "daily-note",
    filePath: "",
    position: "append",
    section: "none",
    heading: "",
    lineFormat: "task",
    addCurrentTime: false,
  },
  shopping: {
    destination: "existing-file",
    filePath: "",
    position: "prepend",
    section: "none",
    heading: "",
    lineFormat: "task",
    addCurrentTime: false,
  },
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [mode, setMode] = useState<InputMode>("note");
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { text?: string; mode?: string }) {
    setIsLoading(true);
    try {
      const selectedMode = isInputMode(values.mode) ? values.mode : mode;
      const result = await saveInput({
        vaultPath: stringPreference(preferences.vaultPath),
        dailyNoteFolder: stringPreference(preferences.dailyNoteFolder),
        dailyNoteFileFormat: stringPreference(preferences.dailyNoteFileFormat, "YYYY-MM-DD"),
        route: readRoute(preferences, selectedMode),
        input: values.text ?? "",
      });

      await showToast({
        style: Toast.Style.Success,
        title: MODE_LABELS[selectedMode] + " saved",
        message: result.relativePath,
      });

      setText("");
      setMode("note");

      if (booleanPreference(preferences.openObsidianAfterSave)) {
        try {
          await open(result.absolutePath, "Obsidian");
        } catch {
          await showToast({
            style: Toast.Style.Failure,
            title: "Saved, but Obsidian could not be opened",
            message: result.relativePath,
          });
        }
      }

      await closeMainWindow();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save the input.";
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Talk to Action for Raycast"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Checkmark} onSubmit={handleSubmit} />
          <ActionPanel.Section title="Input Type">
            <Action
              title="Select Daily Note"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "1" }}
              onAction={() => setMode("note")}
            />
            <Action
              title="Select Task"
              icon={Icon.CheckList}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
              onAction={() => setMode("task")}
            />
            <Action
              title="Select Shopping"
              icon={Icon.Cart}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
              onAction={() => setMode("shopping")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Type" value={mode} onChange={(value) => setMode(value as InputMode)}>
        <Form.Dropdown.Item value="note" title="⌘1 Daily Note" />
        <Form.Dropdown.Item value="task" title="⌘2 To Do" />
        <Form.Dropdown.Item value="shopping" title="⌘3 Shopping" />
      </Form.Dropdown>
      <Form.TextArea
        id="text"
        title="Text"
        value={text}
        onChange={setText}
        placeholder="Write something to save"
        autoFocus
      />
    </Form>
  );
}

function readRoute(preferences: Preferences, mode: InputMode): Route {
  const defaults = DEFAULT_ROUTES[mode];
  const prefix = mode === "note" ? "note" : mode;

  return {
    destination: enumPreference<Destination>(preferences[prefix + "Destination"], defaults.destination),
    filePath: stringPreference(preferences[prefix + "FilePath"], defaults.filePath),
    position: enumPreference<Position>(preferences[prefix + "Position"], defaults.position),
    section: enumPreference<Section>(preferences[prefix + "Section"], defaults.section),
    heading: stringPreference(preferences[prefix + "Heading"], defaults.heading),
    lineFormat: enumPreference<LineFormat>(preferences[prefix + "LineFormat"], defaults.lineFormat),
    addCurrentTime: booleanPreference(preferences[prefix + "AddCurrentTime"], defaults.addCurrentTime),
  };
}

function stringPreference(value: PreferenceValue, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function booleanPreference(value: PreferenceValue, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function enumPreference<T extends string>(value: PreferenceValue, fallback: T): T {
  return typeof value === "string" && value ? (value as T) : fallback;
}

function isInputMode(value: string | undefined): value is InputMode {
  return value === "note" || value === "task" || value === "shopping";
}
