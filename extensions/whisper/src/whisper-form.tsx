import { Action, ActionPanel, Clipboard, Form, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { Fragment, useState } from "react";
import { createSecret, formatDuration, parseDuration } from "./shared";

const DEFAULT_DURATION_SECONDS = 3600;

interface KvRow {
  key: string;
  value: string;
}

interface KvSection {
  name: string;
  rows: KvRow[];
}

interface FormValues {
  secret?: string;
  duration: string;
  selfDestruct: boolean;
}

// Mirrors the web UI's multivalue rules exactly: same JSON shape, same validation.
export function buildMultiValuePayload(rows: KvRow[], sections: KvSection[]): { json?: string; error?: string } {
  const obj: Record<string, unknown> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key || row.value === "") continue;
    if (key in obj) return { error: `Duplicate key: "${key}". Each key must be unique.` };
    obj[key] = row.value;
  }

  const seenSectionNames = new Set<string>();
  for (const section of sections) {
    const name = section.name.trim();
    const sectionObj: Record<string, string> = {};
    let duplicateKey: string | null = null;
    for (const row of section.rows) {
      const key = row.key.trim();
      if (!key || row.value === "") continue;
      if (key in sectionObj) {
        duplicateKey = duplicateKey ?? key;
        continue;
      }
      sectionObj[key] = row.value;
    }
    const isEmpty = Object.keys(sectionObj).length === 0;
    // Error precedence mirrors the web UI: name-required -> duplicate-name -> duplicate-key.
    if (isEmpty && !name) continue; // empty + unnamed: silently drop
    if (!name) return { error: "Section name is required (or remove the empty section)." };
    if (name in obj || seenSectionNames.has(name)) {
      return {
        error: `Duplicate name: "${name}". Section names cannot collide with top-level keys or other sections.`,
      };
    }
    if (duplicateKey) return { error: `Duplicate key in section "${name}": "${duplicateKey}".` };
    if (isEmpty) continue; // named but empty: silently drop
    seenSectionNames.add(name);
    obj[name] = sectionObj;
  }

  if (Object.keys(obj).length === 0) return { error: "Add at least one filled key/value pair." };
  return { json: JSON.stringify(obj) };
}

export default function Command() {
  const [mode, setMode] = useState<string>("freeform");
  const [rows, setRows] = useState<KvRow[]>([{ key: "", value: "" }]);
  const [sections, setSections] = useState<KvSection[]>([]);

  function updateRow(index: number, field: "key" | "value", newValue: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: newValue } : row)));
  }

  function updateSectionName(index: number, name: string) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, name } : s)));
  }

  function updateSectionRow(sectionIndex: number, rowIndex: number, field: "key" | "value", newValue: string) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? { ...s, rows: s.rows.map((row, j) => (j === rowIndex ? { ...row, [field]: newValue } : row)) }
          : s,
      ),
    );
  }

  async function handleSubmit(values: FormValues) {
    let plaintext: string;
    if (mode === "multivalue") {
      const result = buildMultiValuePayload(rows, sections);
      if (result.error) {
        await showToast({ style: Toast.Style.Failure, title: result.error });
        return;
      }
      plaintext = result.json as string;
    } else {
      plaintext = values.secret ?? "";
      if (!plaintext.trim()) {
        await showToast({ style: Toast.Style.Failure, title: "Secret cannot be empty" });
        return;
      }
    }

    const durationSeconds = parseDuration(values.duration) ?? DEFAULT_DURATION_SECONDS;

    await showToast({ style: Toast.Style.Animated, title: "Encrypting secret..." });

    try {
      const expirationTimestamp = Math.floor(Date.now() / 1000) + durationSeconds;
      const shareUrl = await createSecret(plaintext, expirationTimestamp, values.selfDestruct);
      await Clipboard.copy(shareUrl);

      const durationDisplay = formatDuration(durationSeconds);
      const destructNote = values.selfDestruct ? "Self-destructs after first view." : "Can be viewed multiple times.";

      await showHUD(`Copied! Expires in ${durationDisplay}. ${destructNote}`);
    } catch (error) {
      console.error("Failed to create secret:", error);
      const message = error instanceof Error ? error.message : "Please try again.";
      await showToast({ style: Toast.Style.Failure, title: "Failed to create secret", message });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Secret" onSubmit={handleSubmit} />
          {mode === "multivalue" && (
            <>
              <Action
                title="Add Entry"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => setRows((prev) => [...prev, { key: "", value: "" }])}
              />
              <Action
                title="Add Section"
                icon={Icon.PlusSquare}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                onAction={() => setSections((prev) => [...prev, { name: "", rows: [{ key: "", value: "" }] }])}
              />
              {rows.length > 1 && (
                <Action
                  title="Remove Last Entry"
                  icon={Icon.Minus}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => setRows((prev) => prev.slice(0, -1))}
                />
              )}
              {sections.length > 0 && (
                <>
                  <Action
                    title="Add Entry to Last Section"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "n" }}
                    onAction={() =>
                      setSections((prev) =>
                        prev.map((s, i) =>
                          i === prev.length - 1 ? { ...s, rows: [...s.rows, { key: "", value: "" }] } : s,
                        ),
                      )
                    }
                  />
                  <Action
                    title="Remove Last Section"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    onAction={() => setSections((prev) => prev.slice(0, -1))}
                  />
                </>
              )}
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Input Mode" value={mode} onChange={setMode}>
        <Form.Dropdown.Item value="freeform" title="Free Form" />
        <Form.Dropdown.Item value="multivalue" title="Multiple Values" />
      </Form.Dropdown>

      {mode === "freeform" && (
        <Form.TextArea id="secret" title="Secret" placeholder="Enter your secret (password, API key, note...)" />
      )}

      {mode === "multivalue" && (
        <>
          <Form.Description text="Entries (use the Actions menu — ⌘K — to add or remove entries and sections)" />
          {rows.map((row, i) => (
            <Form.TextField
              key={`row-${i}-key`}
              id={`row-${i}-key`}
              title={`Key ${i + 1}`}
              placeholder="Key"
              value={row.key}
              onChange={(v) => updateRow(i, "key", v)}
            />
          ))}
          {rows.map((row, i) => (
            <Form.PasswordField
              key={`row-${i}-value`}
              id={`row-${i}-value`}
              title={`Value ${i + 1}`}
              placeholder="Value"
              value={row.value}
              onChange={(v) => updateRow(i, "value", v)}
            />
          ))}
          {sections.map((section, si) => (
            <Fragment key={`section-${si}`}>
              <Form.Separator />
              <Form.TextField
                id={`section-${si}-name`}
                title={`Section ${si + 1}`}
                placeholder="Section name (e.g. database)"
                value={section.name}
                onChange={(v) => updateSectionName(si, v)}
              />
              {section.rows.map((row, ri) => (
                <Fragment key={`s${si}-r${ri}`}>
                  <Form.TextField
                    id={`s${si}-r${ri}-key`}
                    title={`↳ Key ${ri + 1}`}
                    placeholder="Key"
                    value={row.key}
                    onChange={(v) => updateSectionRow(si, ri, "key", v)}
                  />
                  <Form.PasswordField
                    id={`s${si}-r${ri}-value`}
                    title={`↳ Value ${ri + 1}`}
                    placeholder="Value"
                    value={row.value}
                    onChange={(v) => updateSectionRow(si, ri, "value", v)}
                  />
                </Fragment>
              ))}
            </Fragment>
          ))}
        </>
      )}

      <Form.Dropdown id="duration" title="Expires in" defaultValue="1h">
        <Form.Dropdown.Item value="30m" title="30 minutes" />
        <Form.Dropdown.Item value="1h" title="1 hour" />
        <Form.Dropdown.Item value="24h" title="24 hours" />
        <Form.Dropdown.Item value="7d" title="7 days" />
      </Form.Dropdown>
      <Form.Checkbox id="selfDestruct" title="Self-destruct" label="Delete after first view" defaultValue={true} />
    </Form>
  );
}
