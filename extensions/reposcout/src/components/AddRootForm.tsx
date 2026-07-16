import { useRef, useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";

/**
 * An in-extension folder picker. Uses Raycast's native `Form.FilePicker` so the
 * user can choose folders without leaving RepoScout.
 *
 * Important UX detail: a Raycast `Form` does not save on its own — picking a
 * folder only sets the field value. So we commit **as soon as folders are
 * picked** (via `onChange`) and pop back, which matches the natural "pick a
 * folder and it's added" expectation. The manual path field still commits on
 * submit (⏎) for typed paths. Presentation only — list logic lives in `roots.ts`.
 */
export interface AddRootFormProps {
  /** Persist the chosen folders (from the store). */
  readonly onAdd: (paths: readonly string[]) => void | Promise<void>;
}

interface AddRootValues {
  readonly folders: string[];
  readonly manualPath: string;
}

export function AddRootForm({ onAdd }: AddRootFormProps): React.JSX.Element {
  const { pop } = useNavigation();
  const [error, setError] = useState<string | undefined>(undefined);
  // Guard so an in-flight commit can't fire twice (picker onChange + submit).
  const committing = useRef(false);

  async function commit(paths: readonly string[]): Promise<void> {
    const cleaned = paths.map((path) => path.trim()).filter((path) => path.length > 0);
    if (cleaned.length === 0 || committing.current) {
      return;
    }
    committing.current = true;
    await onAdd(cleaned);
    await showToast({
      style: Toast.Style.Success,
      title: cleaned.length > 1 ? `Added ${cleaned.length} folders` : "Folder added",
      message: "Indexing repositories…",
    });
    pop();
  }

  async function handleSubmit(values: AddRootValues): Promise<void> {
    const chosen = [...(values.folders ?? [])];
    const manual = values.manualPath.trim();
    if (manual.length > 0) {
      chosen.push(manual);
    }
    if (chosen.length === 0) {
      setError("Pick a folder or type a path.");
      return;
    }
    await commit(chosen);
  }

  return (
    <Form
      navigationTitle="Add Search Folders"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Folders" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Pick one or more folders — they're added immediately. Or type a path below and press ⏎." />
      <Form.FilePicker
        id="folders"
        title="Folders"
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles={false}
        onChange={(paths) => {
          if (paths.length > 0) {
            void commit(paths);
          }
        }}
      />
      <Form.TextField
        id="manualPath"
        title="Or type a path"
        placeholder="~/code"
        error={error}
        onChange={() => {
          if (error) {
            setError(undefined);
          }
        }}
      />
    </Form>
  );
}
