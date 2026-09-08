import { failToast } from "@chrismessina/raycast-kit";
import { useMemo, useState } from "react";
import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { listAttributeOptions, listAttributeStatuses, updateRecord } from "../api/endpoints";
import type { AttioRecord, Attribute } from "../api/types";
import { recordTitle } from "../lib/display";
import { changedValues, editableAttributes, initialFieldValue } from "../lib/edit-mapping";

/**
 * Schema-driven edit form (spec §8.6): fields from is_writable + type, values
 * pre-filled, ONLY changed attributes sent, via PUT (PATCH appends multiselects).
 * Clearing a previously non-empty value requires confirmation (fail-closed on
 * live CRM data). record-reference / actor-reference / personal-name /
 * location / interaction are deferred — not rendered.
 */
export default function RecordEditForm(props: {
  objectSlug: string;
  singularNoun: string;
  record: AttioRecord;
  attributes: Attribute[];
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const editable = useMemo(() => editableAttributes(props.attributes), [props.attributes]);
  const excluded = useMemo(
    () => props.attributes.filter((a) => !a.is_archived && !editable.includes(a)).map((a) => a.title),
    [props.attributes, editable],
  );
  const initial = useMemo(() => {
    const m: Record<string, unknown> = {};
    for (const a of editable) m[a.api_slug] = initialFieldValue(a, props.record.values);
    return m;
  }, [editable, props.record]);
  const [current, setCurrent] = useState<Record<string, unknown>>(initial);
  const set = (slug: string) => (value: unknown) => setCurrent((c) => ({ ...c, [slug]: value }));

  // Options/statuses for dropdowns, fetched lazily for just this object's select/status attributes.
  const { data: choices } = useCachedPromise(
    async (objectSlug: string, slugs: string) => {
      const out: Record<string, string[]> = {};
      for (const slug of slugs.split(",").filter(Boolean)) {
        const a = editable.find((x) => x.api_slug === slug);
        if (!a) continue;
        if (a.type === "select")
          out[slug] = (await listAttributeOptions(objectSlug, slug)).data
            .filter((o) => !o.is_archived)
            .map((o) => o.title);
        if (a.type === "status")
          out[slug] = (await listAttributeStatuses(objectSlug, slug)).data
            .filter((s) => !s.is_archived)
            .map((s) => s.title);
      }
      return out;
    },
    [
      props.objectSlug,
      editable
        .filter((a) => a.type === "select" || a.type === "status")
        .map((a) => a.api_slug)
        .join(","),
    ],
  );

  async function submit() {
    let changed: Record<string, unknown[]>;
    try {
      changed = changedValues(initial, current, editable);
    } catch (error) {
      showFailureToast(error, { title: "Invalid value" });
      return;
    }
    if (Object.keys(changed).length === 0) {
      await showToast(Toast.Style.Success, "No changes");
      pop();
      return;
    }
    for (const a of editable) {
      if (a.is_required && a.api_slug in changed && changed[a.api_slug].length === 0) {
        showFailureToast(new Error(`${a.title} is required`), { title: `${a.title} is required` });
        return;
      }
    }
    const cleared = Object.entries(changed).filter(([slug, v]) => v.length === 0 && String(initial[slug] ?? "") !== "");
    if (cleared.length > 0) {
      const ok = await confirmAlert({
        title: `Clear ${cleared.length} value${cleared.length > 1 ? "s" : ""}?`,
        message: cleared.map(([slug]) => editable.find((a) => a.api_slug === slug)?.title ?? slug).join(", "),
        primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
      });
      if (!ok) return;
    }
    const toast = await showToast(Toast.Style.Animated, "Saving", recordTitle(props.record, props.objectSlug));
    try {
      await updateRecord(props.objectSlug, props.record.id.record_id, { data: { values: changed } });
      toast.style = Toast.Style.Success;
      toast.title = "Saved";
      props.onSaved();
      pop();
    } catch (error) {
      failToast(toast, error, { title: "Save failed" });
    }
  }

  return (
    <Form
      navigationTitle={`Edit ${props.singularNoun}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save Changes" onSubmit={submit} />
        </ActionPanel>
      }
    >
      {editable.map((a) => {
        const val = current[a.api_slug];
        switch (a.type) {
          case "checkbox":
            return (
              <Form.Checkbox
                key={a.api_slug}
                id={a.api_slug}
                label={a.title}
                value={Boolean(val)}
                onChange={set(a.api_slug)}
              />
            );
          case "date":
          case "timestamp":
            return (
              <Form.DatePicker
                key={a.api_slug}
                id={a.api_slug}
                title={a.title}
                type={a.type === "date" ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime}
                value={(val as Date) ?? null}
                onChange={set(a.api_slug)}
              />
            );
          case "select":
          case "status": {
            const opts = choices?.[a.api_slug];
            if (!opts) return <Form.Description key={a.api_slug} title={a.title} text="Loading choices…" />;
            if (a.is_multiselect) {
              // Array-valued state end to end: a joined "A, B" string is not an
              // option, and a Dropdown would PUT a single value over the rest.
              const selected = Array.isArray(val) ? (val as string[]) : [];
              // Union in the INITIAL selections too: an archived option lives in
              // neither opts nor (once deselected) the current selection, and it
              // must stay re-selectable until the form is saved.
              const initialSel = Array.isArray(initial[a.api_slug]) ? (initial[a.api_slug] as string[]) : [];
              return (
                <Form.TagPicker
                  key={a.api_slug}
                  id={a.api_slug}
                  title={a.title}
                  value={selected}
                  onChange={set(a.api_slug)}
                >
                  {[...new Set([...opts, ...initialSel, ...selected])].map((o) => (
                    <Form.TagPicker.Item key={o} value={o} title={o} />
                  ))}
                </Form.TagPicker>
              );
            }
            return (
              <Form.Dropdown
                key={a.api_slug}
                id={a.api_slug}
                title={a.title}
                value={String(val ?? "")}
                onChange={set(a.api_slug)}
              >
                {!a.is_required && <Form.Dropdown.Item value="" title="—" />}
                {opts.map((o) => (
                  <Form.Dropdown.Item key={o} value={o} title={o} />
                ))}
              </Form.Dropdown>
            );
          }
          default:
            return (
              <Form.TextField
                key={a.api_slug}
                id={a.api_slug}
                title={a.title + (a.is_required ? " *" : "")}
                placeholder={a.is_multiselect ? "Comma-separated" : undefined}
                value={String(val ?? "")}
                onChange={set(a.api_slug)}
              />
            );
        }
      })}
      {excluded.length > 0 && (
        <Form.Description
          text={`Not editable here: ${excluded.slice(0, 8).join(", ")}${
            excluded.length > 8 ? `, and ${excluded.length - 8} more` : ""
          } — open in Attio to change ${excluded.length === 1 ? "it" : "these"}.`}
        />
      )}
    </Form>
  );
}
