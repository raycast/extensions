import { Action, ActionPanel, Form } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useRef, useState } from "react";
import { normalizeTime } from "./lib/time";
import { defaultTimeIn as getDefaultTimeIn, setTemplateTimeIn, templateName } from "./lib/roster";
import { DEFAULT_BODY, type Store } from "./lib/types";
import { reportError, useStore, type SaveStore } from "./lib/storage";

export default function TemplateCommand() {
  const { data, isLoading, isSaving, save } = useStore();
  if (!data)
    return (
      <Form isLoading={isLoading}>
        <Form.Description
          text={isLoading ? "Loading templates…" : "Could not load templates. Close and reopen this command to retry."}
        />
      </Form>
    );
  return <TemplateForm data={data} save={save} isSaving={isSaving} />;
}
function TemplateForm({ data, save, isSaving }: { data: Store; save: SaveStore; isSaving: boolean }) {
  type Draft = { body: string; heading: string; notes: string; defaultTimeIn: string };
  const [selected, setSelected] = useState(data.selectedTemplateId);
  const [body, setBody] = useState(data.templates.find((item) => item.id === selected)?.body ?? DEFAULT_BODY);
  const [heading, setHeading] = useState(data.templates.find((item) => item.id === selected)?.heading ?? "");
  const [notes, setNotes] = useState(data.templates.find((item) => item.id === selected)?.notes ?? "");
  const [defaultTimeIn, setDefaultTimeIn] = useState(getDefaultTimeIn(data, selected));
  const drafts = useRef<Record<string, Draft>>({});
  function loadDraft(id: string): Draft {
    const draft = drafts.current[id];
    if (draft) return draft;
    const template = data.templates.find((item) => item.id === id);
    return {
      body: template?.body ?? DEFAULT_BODY,
      heading: template?.heading ?? "",
      notes: template?.notes ?? "",
      defaultTimeIn: getDefaultTimeIn(data, id),
    };
  }
  async function submit() {
    let normalizedTime: string;
    try {
      normalizedTime = normalizeTime(defaultTimeIn);
    } catch (error) {
      await reportError("Invalid Default Time", error);
      return;
    }
    if (!body.trim()) {
      await reportError("Could Not Save Template", "Enter the template table.");
      return;
    }
    const id = selected === "create-new" ? randomUUID() : selected;
    const saved = await save((store) => {
      const next: Store = {
        ...store,
        selectedTemplateId: id,
        templates:
          selected === "create-new"
            ? [
                ...store.templates,
                {
                  id,
                  label: `Template ${store.templates.length}`,
                  body,
                  heading,
                  notes,
                  defaultTimeIn: normalizedTime,
                },
              ]
            : store.templates.map((item) =>
                item.id === id ? { ...item, body, heading, notes, defaultTimeIn: normalizedTime } : item,
              ),
      };
      const changed = selected === "create-new" || normalizedTime !== getDefaultTimeIn(store, id);
      return changed ? setTemplateTimeIn(next, id, normalizedTime) : next;
    }, "Template Saved");
    if (saved) setSelected(id);
  }
  return (
    <Form
      isLoading={isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Template" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="template"
        title="Template"
        value={selected}
        onChange={async (id) => {
          drafts.current[selected] = { body, heading, notes, defaultTimeIn };
          if (id === "create-new") {
            drafts.current[id] = { body: DEFAULT_BODY, heading: "", notes: "", defaultTimeIn: "" };
            setSelected(id);
            setBody(DEFAULT_BODY);
            setHeading("");
            setNotes("");
            setDefaultTimeIn("");
            return;
          }
          if (await save((store) => ({ ...store, selectedTemplateId: id }), "Template Selected")) {
            const draft = loadDraft(id);
            setSelected(id);
            setDefaultTimeIn(draft.defaultTimeIn);
            setHeading(draft.heading);
            setNotes(draft.notes);
            setBody(draft.body);
          }
        }}
      >
        {data.templates.map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={templateName(item)} />
        ))}
        <Form.Dropdown.Item value="create-new" title="Create new" />
      </Form.Dropdown>
      <Form.TextField
        id="defaultTimeIn"
        title="Default Time In"
        value={defaultTimeIn}
        onChange={setDefaultTimeIn}
        placeholder="9:00 AM"
        info="Changing this applies the time to this template’s existing and future entries, except no-shows. Leave blank for no default."
      />
      <Form.TextField id="heading" title="Template Heading" value={heading} onChange={setHeading} />
      <Form.TextArea id="notes" title="Template Notes" enableMarkdown value={notes} onChange={setNotes} />
      <Form.TextArea id="body" title="Template Table" enableMarkdown value={body} onChange={setBody} />
    </Form>
  );
}
