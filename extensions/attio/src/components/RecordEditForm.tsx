import { failToast } from "@chrismessina/raycast-kit";
import { Fragment, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { listAttributeOptions, listAttributeStatuses, updateRecord } from "../api/endpoints";
import { missingScopes } from "../api/operations";
import type { AttioRecord, Attribute } from "../api/types";
import { useMembers } from "../hooks/useMembers";
import { useSchema } from "../hooks/useSchema";
import { cacheNs, useSelf } from "../hooks/useSelf";
import { recordTitle } from "../lib/display";
import { changedValues, deferredEditableAttributes, editableAttributes, initialFieldValue } from "../lib/edit-mapping";
import { shortId } from "../lib/format";
import RecordRefPicker, { decodeRef, encodeRef } from "./RecordRefPicker";

/**
 * Schema-driven edit form (spec §8.6): fields from is_writable + type, values
 * pre-filled, ONLY changed attributes sent, via PUT (PATCH appends multiselects).
 * Clearing a previously non-empty value requires confirmation (fail-closed on
 * live CRM data). Covers the standard editable types PLUS names (split
 * first/last, like Attio's editor), owners (workspace members), and single
 * record links (async record search). Multiselect record links, location, and
 * interaction stay Attio-only.
 */
export default function RecordEditForm(props: {
  objectSlug: string;
  singularNoun: string;
  record: AttioRecord;
  attributes: Attribute[];
  titleFor?: (id: string) => { title: string; url?: string } | undefined;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const self = useSelf();
  const schema = useSchema();
  const members = useMembers();
  const canListMembers = missingScopes(self.granted, "listMembers").length === 0;
  const editable = useMemo(() => editableAttributes(props.attributes), [props.attributes]);
  const deferred = useMemo(() => deferredEditableAttributes(props.attributes), [props.attributes]);
  const excluded = useMemo(
    () => props.attributes.filter((a) => !a.is_archived && !editable.includes(a) && !deferred.includes(a)).length > 0,
    [props.attributes, editable, deferred],
  );
  const submitting = useRef(false);

  const slugByObjectId = useMemo(
    () => Object.fromEntries(schema.objects.map((o) => [o.id.object_id, o.api_slug])),
    [schema.objects],
  );
  const allObjectSlugs = useMemo(() => schema.objects.map((o) => o.api_slug), [schema.objects]);

  const initial = useMemo(() => {
    const m: Record<string, unknown> = {};
    for (const a of editable) m[a.api_slug] = initialFieldValue(a, props.record.values);
    return m;
  }, [editable, props.record]);
  const [current, setCurrent] = useState<Record<string, unknown>>(initial);
  const set = (slug: string) => (value: unknown) => setCurrent((c) => ({ ...c, [slug]: value }));

  // Deferred fields track separately as strings: personal-name splits into
  // ":first"/":last" sub-keys; actor/record references hold encoded ids.
  const initialD = useMemo(() => {
    const m: Record<string, string> = {};
    for (const a of deferred) {
      const v = props.record.values[a.api_slug]?.[0];
      if (a.type === "personal-name") {
        m[a.api_slug + ":first"] = (v?.attribute_type === "personal-name" && v.first_name) || "";
        m[a.api_slug + ":last"] = (v?.attribute_type === "personal-name" && v.last_name) || "";
      } else if (v?.attribute_type === "actor-reference") m[a.api_slug] = v.referenced_actor_id ?? "";
      else if (v?.attribute_type === "record-reference") m[a.api_slug] = encodeRef(v.target_object, v.target_record_id);
      else m[a.api_slug] = "";
    }
    return m;
  }, [deferred, props.record]);
  const [currentD, setCurrentD] = useState<Record<string, string>>(initialD);
  const setD = (slug: string) => (v: string) => setCurrentD((c) => ({ ...c, [slug]: v }));

  // Options/statuses for dropdowns, fetched lazily for just this object's select/status attributes.
  const { data: choices } = useCachedPromise(
    // _ns is cache-key-only (token fingerprint scoping); folding it into
    // objectSlug would corrupt the request URL.
    async (_ns: string, objectSlug: string, slugs: string) => {
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
      cacheNs,
      props.objectSlug,
      editable
        .filter((a) => a.type === "select" || a.type === "status")
        .map((a) => a.api_slug)
        .join(","),
    ],
  );

  async function submit() {
    // Guard BEFORE any await — the clear-confirmation alert leaves a window
    // where a second ⌘↵ could otherwise start a duplicate submit.
    if (submitting.current) return;
    submitting.current = true;
    try {
      await doSubmit();
    } finally {
      submitting.current = false;
    }
  }

  async function doSubmit() {
    let changed: Record<string, unknown[]>;
    try {
      changed = changedValues(initial, current, editable);
    } catch (error) {
      showFailureToast(error, { title: "Invalid value" });
      return;
    }
    for (const a of editable) {
      if (a.is_required && a.api_slug in changed && changed[a.api_slug].length === 0) {
        showFailureToast(new Error(`${a.title} is required`), { title: `${a.title} is required` });
        return;
      }
    }
    // Deferred fields: trim-compare so whitespace-only edits never PUT.
    for (const a of deferred) {
      let wire: unknown[];
      if (a.type === "personal-name") {
        const first = (currentD[a.api_slug + ":first"] ?? "").trim();
        const last = (currentD[a.api_slug + ":last"] ?? "").trim();
        if (first === initialD[a.api_slug + ":first"].trim() && last === initialD[a.api_slug + ":last"].trim())
          continue;
        wire =
          first || last
            ? [{ first_name: first, last_name: last, full_name: [first, last].filter(Boolean).join(" ") }]
            : [];
      } else {
        if ((currentD[a.api_slug] ?? "").trim() === (initialD[a.api_slug] ?? "").trim()) continue;
        const v = (currentD[a.api_slug] ?? "").trim();
        if (a.type === "actor-reference")
          wire = v ? [{ referenced_actor_type: "workspace-member", referenced_actor_id: v }] : [];
        else wire = v ? [decodeRef(v)] : [];
      }
      if (a.is_required && wire.length === 0) {
        showFailureToast(new Error(`${a.title} is required`), { title: `${a.title} is required` });
        return;
      }
      changed[a.api_slug] = wire;
    }
    if (Object.keys(changed).length === 0) {
      await showToast(Toast.Style.Success, "No changes");
      pop();
      return;
    }
    const hadValue = (slug: string) =>
      (Array.isArray(initial[slug]) ? (initial[slug] as unknown[]).length > 0 : String(initial[slug] ?? "") !== "") ||
      (initialD[slug] ?? "") !== "" ||
      (initialD[slug + ":first"] ?? "") !== "" ||
      (initialD[slug + ":last"] ?? "") !== "";
    const cleared = Object.entries(changed).filter(([slug, v]) => v.length === 0 && hadValue(slug));
    if (cleared.length > 0) {
      const all = [...editable, ...deferred];
      const ok = await confirmAlert({
        title: `Clear ${cleared.length} value${cleared.length > 1 ? "s" : ""}?`,
        message: cleared.map(([slug]) => all.find((a) => a.api_slug === slug)?.title ?? slug).join(", "),
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

  const renderDeferred = (a: Attribute) => {
    if (a.type === "personal-name")
      // Split fields, matching Attio's own editor.
      return (
        <Fragment key={a.api_slug}>
          <Form.TextField
            id={a.api_slug + ":first"}
            title="First Name"
            value={currentD[a.api_slug + ":first"] ?? ""}
            onChange={setD(a.api_slug + ":first")}
          />
          <Form.TextField
            id={a.api_slug + ":last"}
            title="Last Name"
            value={currentD[a.api_slug + ":last"] ?? ""}
            onChange={setD(a.api_slug + ":last")}
          />
        </Fragment>
      );
    if (a.type === "actor-reference") {
      if (!canListMembers)
        return (
          <Form.Description
            key={a.api_slug}
            title={a.title}
            text="Picking a member needs the user_management:read scope on your token."
          />
        );
      // Keep the current owner selectable even while the member list is
      // loading/empty — otherwise a required field shows a blank dropdown.
      const currentId = initialD[a.api_slug];
      const memberItems = new Map<string, string>(
        currentId ? [[currentId, members.nameFor(currentId) ?? shortId(currentId)]] : [],
      );
      for (const m of members.all) memberItems.set(m.id, m.name);
      return (
        <Form.Dropdown
          key={a.api_slug}
          id={a.api_slug}
          title={a.title}
          value={currentD[a.api_slug] ?? ""}
          onChange={setD(a.api_slug)}
        >
          {/* Keep "—" when the field STARTED empty, even if required — the user
              must be able to revert an exploratory pick without abandoning the form. */}
          {(!a.is_required || !currentId) && <Form.Dropdown.Item value="" title="—" />}
          {[...memberItems].map(([id, name]) => (
            <Form.Dropdown.Item key={id} value={id} title={name} icon={Icon.Person} />
          ))}
        </Form.Dropdown>
      );
    }
    // record-reference
    const allowedIds = a.config?.record_reference?.allowed_object_ids ?? null;
    const allowed = (allowedIds?.length ? allowedIds.map((id) => slugByObjectId[id]) : allObjectSlugs).filter(
      (s): s is string => typeof s === "string" && s !== "",
    );
    const init = initialD[a.api_slug]
      ? {
          value: initialD[a.api_slug],
          title:
            props.titleFor?.(decodeRef(initialD[a.api_slug]).target_record_id)?.title ??
            shortId(decodeRef(initialD[a.api_slug]).target_record_id),
        }
      : undefined;
    return (
      <RecordRefPicker
        key={a.api_slug}
        attr={a}
        allowedSlugs={allowed}
        initial={init}
        value={currentD[a.api_slug] ?? ""}
        onChange={setD(a.api_slug)}
      />
    );
  };

  return (
    <Form
      navigationTitle={`Edit ${props.singularNoun}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save Changes" onSubmit={submit} />
        </ActionPanel>
      }
    >
      {/* One pass over the schema keeps Attio's natural field order — name and
          company sit up top, not appended after everything else. */}
      {props.attributes
        .filter((a) => editable.includes(a) || deferred.includes(a))
        .map((a) => {
          if (deferred.includes(a)) return renderDeferred(a);
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
                  title={a.title}
                  info={a.is_required && !a.is_default_value_enabled ? "Required" : undefined}
                  placeholder={a.is_multiselect ? "Comma-separated" : undefined}
                  value={String(val ?? "")}
                  onChange={set(a.api_slug)}
                />
              );
          }
        })}
      {excluded && <Form.Description text="Open in Attio to view the complete record." />}
    </Form>
  );
}
