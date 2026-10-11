import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import { newEntry } from "../lib/markdown";
import { normalizeTime } from "../lib/time";
import { reportError, type SaveStore } from "../lib/storage";
import { defaultTimeIn, templateName } from "../lib/roster";
import type { Entry, Store } from "../lib/types";

export function EntryForm({ entry, save, data }: { entry?: Entry; save: SaveStore; data: Store }) {
  const [templateId, setTemplateId] = useState(data.selectedTemplateId);
  const { pop } = useNavigation();
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [noShow, setNoShow] = useState(entry?.status === "no_show");
  async function submit(values: { login: string; name: string; timeIn?: string; timeOut?: string }) {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      if (!values.login.trim() || !values.name.trim()) throw new Error("Login and name are required.");
      const timeIn = normalizeTime(values.timeIn ?? "");
      const timeOut = noShow ? "" : normalizeTime(values.timeOut ?? "");
      const saved = await save(
        (store) => {
          if (!entry) {
            const template = store.templates.find((item) => item.id === templateId);
            if (!template) throw new Error("Select a template in the Template command first.");
            return {
              ...store,
              selectedTemplateId: templateId,
              entries: [
                ...store.entries,
                newEntry(values.login, values.name, template, defaultTimeIn(store, templateId)),
              ],
            };
          }
          if (!store.entries.some((item) => item.id === entry.id)) throw new Error("This entry no longer exists.");
          return {
            ...store,
            entries: store.entries.map((item) =>
              item.id === entry.id
                ? {
                    ...item,
                    login: values.login.trim(),
                    name: values.name.trim(),
                    timeIn,
                    timeOut,
                    status: noShow ? "no_show" : timeOut ? "clocked_out" : "present",
                  }
                : item,
            ),
          };
        },
        entry ? "Entry Saved" : "Entry Created",
      );
      if (saved) pop();
    } catch (error) {
      await reportError("Could Not Save Entry", error);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <Form
      navigationTitle={entry ? "Edit Entry" : "Add Entry"}
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={entry ? "Save Entry" : "Create Entry"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      {!entry && (
        <Form.Dropdown id="template" title="Template" value={templateId} onChange={setTemplateId}>
          {data.templates.map((template) => (
            <Form.Dropdown.Item key={template.id} value={template.id} title={templateName(template)} />
          ))}
        </Form.Dropdown>
      )}
      {!entry && <Form.Description title="Default Time In" text={defaultTimeIn(data, templateId) || "Not set"} />}
      <Form.TextField id="login" title="Login" autoFocus defaultValue={entry?.login ?? ""} />
      <Form.TextField id="name" title="Name" defaultValue={entry?.name ?? ""} />
      {entry && (
        <>
          <Form.TextField
            id="timeIn"
            title="Time in"
            defaultValue={entry.status === "no_show" ? defaultTimeIn(data, entry.templateId) : entry.timeIn}
            placeholder="9:00 AM"
          />
          <Form.TextField
            id="timeOut"
            title="Time out"
            defaultValue={entry.timeOut}
            placeholder="5:00 PM"
            info="Leave blank if still present. Ignored while No Show is checked."
          />
          <Form.Checkbox id="noShow" title="Attendance" label="No Show" value={noShow} onChange={setNoShow} />
        </>
      )}
    </Form>
  );
}
