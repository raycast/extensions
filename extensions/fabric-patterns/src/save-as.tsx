import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { saveAs, saveAsName } from "../lib/saveas";
import { ANSWER_REFUSED, errorText, PATTERNS_ROOT, shownPath } from "./deliver";
import { pickerSeed, prefs } from "./storage";

/**
 * Save as… (⇧⌘S): Raycast has no save dialog, so a folder picker and a name. Saves through
 * lib/saveas.ts and never touches the clipboard (ISC-73). `onSaved` gets the path written.
 */
export function SaveAs({
  text,
  defaultName,
  onSaved,
}: {
  text: string;
  defaultName: string;
  onSaved: (path: string) => void;
}) {
  const { pop } = useNavigation();
  const [folder, setFolder] = useState<string[]>(() => pickerSeed(prefs().outputFolder));
  const [name, setName] = useState(defaultName);
  const [errors, setErrors] = useState<{ folder?: string; name?: string }>({});

  async function save() {
    // The name is checked on its own first, so each refusal lands on its own field.
    let file: string;
    try {
      file = saveAsName(name);
    } catch (e) {
      return fail({ name: errorText(e) });
    }
    if (!folder[0]) return fail({ folder: "Choose a folder" });
    try {
      const path = saveAs(folder[0], file, text, { patternsRoot: PATTERNS_ROOT, refused: ANSWER_REFUSED });
      onSaved(path);
      await showToast({ style: Toast.Style.Success, title: "Saved", message: shownPath(path) });
      pop();
    } catch (e) {
      await fail({ folder: errorText(e) });
    }
  }

  async function fail(e: { folder?: string; name?: string }) {
    setErrors(e);
    await showToast({ style: Toast.Style.Failure, title: "Couldn't save", message: e.name ?? e.folder });
  }

  return (
    <Form
      navigationTitle="Save as"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.SaveDocument} onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={folder}
        error={errors.folder}
        onChange={(v) => {
          setFolder(v);
          setErrors((e) => ({ ...e, folder: undefined }));
        }}
      />
      <Form.TextField
        id="name"
        title="Name"
        value={name}
        error={errors.name}
        info="Ends in .md or .txt; a name with no extension gets .md. A taken name gets -2, -3…; nothing is overwritten."
        onChange={(v) => {
          setName(v);
          setErrors((e) => ({ ...e, name: undefined }));
        }}
      />
    </Form>
  );
}
