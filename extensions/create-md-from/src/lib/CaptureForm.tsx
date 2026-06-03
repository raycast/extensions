import {
  Action,
  ActionPanel,
  Form,
  LocalStorage,
  Toast,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { basename } from "path";
import { useEffect, useState } from "react";
import { getDefaultFolder, saveMarkdown } from "./save";

const LAST_FOLDER_KEY = "last-folder";

export interface Resolved {
  /** The Markdown body to write. */
  content: string;
  /** Pre-filled, human-readable file name (without extension). */
  suggestedName: string;
}

/**
 * Shared form for every command: resolves the source content, pre-fills the name
 * field, lets the user override name/folder, and writes the file on submit.
 *
 * The folder defaults to the last one used (persisted in LocalStorage), then the
 * configured preference, then ~/Desktop.
 */
export function CaptureForm({ resolve }: { resolve: () => Promise<Resolved> }) {
  const [name, setName] = useState("");
  const [folders, setFolders] = useState<string[]>([]);

  const { data, isLoading } = usePromise(resolve, [], {
    onData: (d) => setName(d.suggestedName),
    onError: async (error) => {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't create Markdown",
        message: error.message,
      });
      await popToRoot();
    },
  });

  // Default the folder to the last one used (then preference, then ~/Desktop).
  useEffect(() => {
    (async () => {
      const last = await LocalStorage.getItem<string>(LAST_FOLDER_KEY);
      setFolders([last && last.length > 0 ? last : getDefaultFolder()]);
    })();
  }, []);

  // Keep the name field in sync if data arrives after the first render.
  useEffect(() => {
    if (data) setName(data.suggestedName);
  }, [data]);

  async function handleSubmit() {
    if (!data) return;
    const folder = folders[0] ?? getDefaultFolder();
    try {
      const path = await saveMarkdown(folder, name, data.content);
      await LocalStorage.setItem(LAST_FOLDER_KEY, folder); // remember for next time
      await showHUD(`✓ Saved ${basename(path)}`);
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save file",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {/* Primary: ⌘↵ (Raycast form default). */}
          <Action.SubmitForm
            title="Save Markdown File"
            onSubmit={handleSubmit}
          />
          {/* Best-effort plain Enter — unsupported by Raycast for forms; may be ignored. */}
          <Action.SubmitForm
            title="Save (Enter)"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: [], key: "return" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="File Name"
        placeholder="Untitled"
        value={name}
        onChange={setName}
        autoFocus
        info="The .md extension is added automatically."
      />
      <Form.FilePicker
        id="folders"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={folders}
        onChange={setFolders}
      />
    </Form>
  );
}
