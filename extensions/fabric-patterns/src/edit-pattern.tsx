import { Action, ActionPanel, Detail, Form, Icon, Keyboard, showToast, Toast, useNavigation } from "@raycast/api";
import { join } from "node:path";
import { useRef, useState } from "react";
import { listNames, readText } from "../lib/loaders";
import { stateFor } from "../lib/states";
import { patternVariables } from "../lib/variables";
import { savePattern, visibility } from "../lib/writers";
import { errorText, PATTERNS_ROOT, shownPath, shownText } from "./deliver";
import { movePin, prefs } from "./storage";
import { OpenInEditor } from "./open-in-editor";
import { saveFailed } from "./editors";

const read = (p: string) => readText(p) ?? "";

/** Edit (or create, with no `name`) one of the user's own patterns. */
export function EditPattern({
  name,
  copiedFrom,
  keepPins,
  onSaved,
}: {
  name?: string;
  copiedFrom?: string;
  /** A rename leaves the old name's pin, run count and model pin: a built-in of that name still has them. */
  keepPins?: boolean;
  onSaved?: (name: string) => void;
}) {
  const p = prefs();
  const { push, pop } = useNavigation();
  const dir = name ? join(p.myPatternsFolder, name) : undefined;
  const [newName, setNewName] = useState(name ?? "");
  const [system, setSystem] = useState(() => (dir ? read(join(dir, "system.md")) : ""));
  const [user, setUser] = useState(() => (dir ? read(join(dir, "user.md")) : ""));
  const [nameError, setNameError] = useState<string>();
  const nameRef = useRef<Form.TextField>(null);
  const vars = patternVariables(system);

  async function save() {
    try {
      savePattern(p.myPatternsFolder, PATTERNS_ROOT, { name: newName.trim(), system, user, previousName: name });
    } catch (e) {
      setNameError(errorText(e));
      nameRef.current?.focus();
      await saveFailed(e);
      return;
    }
    if (!keepPins) await movePin("pattern", name, newName.trim());
    onSaved?.(newName.trim());
    let names: string[];
    try {
      names = await listNames(p.fabricPath, "--listpatterns");
    } catch (e) {
      // fabric itself failed, so "it can't see your folder" would be the wrong advice.
      await showToast({
        style: Toast.Style.Failure,
        title: "Saved, but fabric didn't answer",
        message: errorText(e),
      });
      pop();
      return;
    }
    if (visibility(newName.trim(), names) === "invisible") {
      push(<CantSeeIt name={newName.trim()} folder={p.myPatternsFolder} fabricPath={p.fabricPath} />);
      return;
    }
    await showToast({ style: Toast.Style.Success, title: "Saved", message: `fabric lists ${newName.trim()}` });
    pop();
  }

  return (
    <Form
      navigationTitle={name ? `Edit Custom Pattern · ${name}` : "New Pattern"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.SaveDocument} onSubmit={save} />
          {dir && <OpenInEditor target={join(dir, "system.md")} shortcut={Keyboard.Shortcut.Common.Open} />}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        ref={nameRef}
        title="Name"
        placeholder="my_pattern"
        value={newName}
        error={nameError}
        onChange={(v) => {
          setNewName(v);
          setNameError(undefined);
        }}
      />
      <Form.TextArea id="system" title="system.md" value={system} onChange={setSystem} enableMarkdown />
      <Form.TextArea
        id="user"
        title="user.md"
        value={user}
        onChange={setUser}
        info="Optional. Leave empty if the pattern doesn't need one."
      />
      <Form.Description
        title="Variables"
        text={
          vars.length
            ? `${vars.join(", ")}: each becomes a field on the Run form.`
            : "None found. Any {{name}} you add becomes a field on the Run form."
        }
      />
      <Form.Description
        title="Saved in"
        text={`${shownPath(join(p.myPatternsFolder, newName || "…"))}${copiedFrom ? ` · copied from ${copiedFrom}` : ""}`}
      />
      <Form.Description text="After saving, the extension checks fabric can see it." />
    </Form>
  );
}

function CantSeeIt({ name, folder, fabricPath }: { name: string; folder: string; fabricPath: string }) {
  const { title, setupCommand } = stateFor("cant-see-pattern", { fabricPath });
  return (
    <Detail
      navigationTitle={title}
      markdown={`## ${title}\n\n**${name}** is saved in \`${shownPath(folder)}\`, but \`fabric -l\` doesn't list it. fabric isn't set to read that folder.\n\nRun \`${shownText(setupCommand ?? "")}\` in a terminal and set **Custom Patterns** to that folder, or change **Custom Patterns Folder** in this extension's preferences to match fabric's.`}
      actions={
        <ActionPanel>
          {setupCommand && <Action.CopyToClipboard title="Copy Setup Command" content={setupCommand} />}
        </ActionPanel>
      }
    />
  );
}
