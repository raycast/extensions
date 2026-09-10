import { failToast } from "@chrismessina/raycast-kit";
import { Fragment, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Form, Icon, open, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { createRecord, listAttributeOptions, listAttributeStatuses } from "../api/endpoints";
import { missingScopes } from "../api/operations";
import type { Attribute } from "../api/types";
import { useMembers } from "../hooks/useMembers";
import { cacheNs, useSelf } from "../hooks/useSelf";
import { creatableAttributes, toWireValue } from "../lib/edit-mapping";
import { openRecordInHomeCommand } from "../lib/open-record";

/**
 * Tag-input companion-field id suffix. ":" can't appear in an Attio api_slug,
 * so a real attribute named e.g. "approval_pending" can never collide.
 */
const PENDING_SUFFIX = ":pending";

/** Placeholder nouns per attribute type — "Type an email address followed by a comma to add". */
const TAG_NOUNS: Record<string, string> = {
  "email-address": "an email address",
  domain: "a domain",
  "phone-number": "a phone number",
};

/**
 * Multiselect free-text entry (Karakeep's Create Bookmark tag pattern): a
 * TagPicker holds committed values; a companion TextField commits on comma or
 * blur. No option lookup — values are whatever the user types.
 */
function TagInput(props: {
  attr: Attribute;
  values: string[];
  onChange: (v: string[]) => void;
  /** Mirrors uncommitted text up so submit can fold it in (⌘↵ skips blur). */
  onPendingChange: (t: string) => void;
  info?: string;
  error?: string;
  initialPending?: string;
}) {
  const [pending, setPendingState] = useState(props.initialPending ?? "");
  const setPending = (t: string) => {
    setPendingState(t);
    props.onPendingChange(t);
  };
  const commit = (raw: string) => {
    const adds = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = [...props.values];
    for (const x of adds) if (!next.includes(x)) next.push(x);
    if (next.length !== props.values.length) props.onChange(next);
  };
  return (
    <>
      <Form.TextField
        id={props.attr.api_slug + PENDING_SUFFIX}
        title={`Add ${props.attr.title}`}
        placeholder={`Type ${TAG_NOUNS[props.attr.type] ?? "a value"} followed by a comma to add`}
        info={props.info}
        error={props.error}
        value={pending}
        onChange={(t) => {
          if (t.includes(",")) {
            const parts = t.split(",");
            commit(parts.slice(0, -1).join(","));
            setPending(parts[parts.length - 1]);
          } else setPending(t);
        }}
        onBlur={() => {
          commit(pending);
          setPending("");
        }}
      />
      <Form.TagPicker id={props.attr.api_slug} title={props.attr.title} value={props.values} onChange={props.onChange}>
        {props.values.map((v) => (
          <Form.TagPicker.Item key={v} value={v} title={v} />
        ))}
      </Form.TagPicker>
    </>
  );
}

/**
 * Schema-driven create form: same field mapping as RecordEditForm, including
 * personal-name (split First/Last) and actor-reference (deal Owner) as a
 * workspace-member dropdown.
 * Empty fields are simply omitted from the POST.
 */
export default function RecordCreateForm(props: {
  objectSlug: string;
  singularNoun: string;
  attributes: Attribute[];
  onCreated: () => void;
  /** Top-level Create commands enable drafts; pushed forms can't (Raycast limitation). */
  enableDrafts?: boolean;
  draftValues?: Record<string, unknown>;
  /** What to do after a successful create — defaults to pop (no-op at a command root). */
  afterCreate?: () => void;
}) {
  const { pop } = useNavigation();
  const self = useSelf();
  const members = useMembers();
  const canListMembers = missingScopes(self.granted, "listMembers").length === 0;
  const creatable = useMemo(() => creatableAttributes(props.attributes), [props.attributes]);
  // Restored draft values seed the form: "<slug>_pending" keys are tag-input
  // text that never got committed; everything else is field state.
  const fromDraft = useMemo(() => {
    const fields: Record<string, unknown> = {};
    const pending: Record<string, string> = {};
    for (const [k, v] of Object.entries(props.draftValues ?? {})) {
      if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
      if (k.endsWith(PENDING_SUFFIX)) pending[k.slice(0, -PENDING_SUFFIX.length)] = String(v);
      else fields[k] = v;
    }
    return { fields, pending };
  }, []);
  const [current, setCurrent] = useState<Record<string, unknown>>(fromDraft.fields);
  // Inline field errors (Raycast-standard validation) — set on submit, cleared on edit.
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const set = (slug: string) => (value: unknown) => {
    setCurrent((c) => ({ ...c, [slug]: value }));
    // Clear the field's error — a ":first"/":last" sub-key clears its base
    // attribute's error, which is where submit records it.
    const base = slug.replace(/:(first|last)$/, "");
    setErrors((e) => (e[slug] || e[base] ? { ...e, [slug]: undefined, [base]: undefined } : e));
  };
  // "Required" only when Attio will actually reject an omission — a required
  // field with a workspace default is satisfied by the default.
  const requiredInfo = (a: Attribute) => (a.is_required && !a.is_default_value_enabled ? "Required" : undefined);
  const submitting = useRef(false);
  // Uncommitted tag-input text per slug — ⌘↵ can submit before blur commits it.
  const pendingTags = useRef<Record<string, string>>(fromDraft.pending);

  const { data: choices } = useCachedPromise(
    // _ns is cache-key-only: it scopes cached choices to the token fingerprint
    // so another workspace's option titles never surface. It must NOT be
    // folded into objectSlug — that string becomes the request URL.
    async (_ns: string, objectSlug: string, slugs: string) => {
      const out: Record<string, string[]> = {};
      for (const slug of slugs.split(",").filter(Boolean)) {
        const a = creatable.find((x) => x.api_slug === slug);
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
      creatable
        .filter((a) => a.type === "select" || a.type === "status")
        .map((a) => a.api_slug)
        .join(","),
    ],
  );

  async function submit() {
    if (submitting.current) return;
    const anyPending = Object.values(pendingTags.current).some((t) => t.trim() !== "");
    if (Object.keys(current).length === 0 && !anyPending) {
      showFailureToast(new Error("Fill in at least one field"), { title: "Nothing to create" });
      return;
    }
    const values: Record<string, unknown[]> = {};
    const nextErrors: Record<string, string> = {};
    for (const a of creatable) {
      let val = current[a.api_slug];
      // Fold in text typed into a tag input but not yet committed by comma/blur.
      const pend = pendingTags.current[a.api_slug]?.trim();
      if (pend) {
        const arr = Array.isArray(val) ? [...(val as string[])] : [];
        for (const x of pend
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean))
          if (!arr.includes(x)) arr.push(x);
        val = arr;
      }
      let wire: unknown[];
      try {
        if (a.type === "personal-name") {
          const first = String(current[a.api_slug + ":first"] ?? "").trim();
          const last = String(current[a.api_slug + ":last"] ?? "").trim();
          wire =
            first || last
              ? [{ first_name: first, last_name: last, full_name: [first, last].filter(Boolean).join(" ") }]
              : [];
        } else if (a.type === "actor-reference")
          wire = val ? [{ referenced_actor_type: "workspace-member", referenced_actor_id: val }] : [];
        // Checkboxes always send what the form shows (an untouched box shows
        // unchecked); everything else empty is omitted so Attio can apply a
        // configured default — which also covers required-with-default fields.
        else wire = toWireValue(a, val ?? (a.type === "checkbox" ? false : ""));
      } catch (error) {
        nextErrors[a.api_slug] = error instanceof Error ? error.message : "Invalid value";
        continue;
      }
      if (a.is_required && !a.is_default_value_enabled && wire.length === 0) {
        nextErrors[a.api_slug] = "Required";
        continue;
      }
      if (wire.length > 0) values[a.api_slug] = wire;
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    submitting.current = true;
    const toast = await showToast(Toast.Style.Animated, `Creating ${props.singularNoun.toLowerCase()}`);
    try {
      const { data } = await createRecord(props.objectSlug, { data: { values } });
      toast.style = Toast.Style.Success;
      toast.title = `${props.singularNoun} created`;
      // Primary opens the record in its home command (standard objects);
      // custom objects have no home command, so Attio is the only target.
      toast.primaryAction = {
        title: `Open ${props.singularNoun}`,
        onAction: async () => {
          if (!(await openRecordInHomeCommand(props.objectSlug, data.id.record_id))) await open(data.web_url);
        },
      };
      toast.secondaryAction = { title: "Open in Attio", onAction: () => open(data.web_url) };
      props.onCreated();
      (props.afterCreate ?? pop)();
    } catch (error) {
      failToast(toast, error, { title: "Create failed" });
    } finally {
      submitting.current = false;
    }
  }

  return (
    <Form
      enableDrafts={props.enableDrafts}
      navigationTitle={`New ${props.singularNoun}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title={`Create ${props.singularNoun}`} onSubmit={submit} />
        </ActionPanel>
      }
    >
      {creatable.map((a) => {
        const val = current[a.api_slug];
        const info = requiredInfo(a);
        const error = errors[a.api_slug];
        switch (a.type) {
          case "personal-name":
            // Split fields, matching Attio's own editor.
            return (
              <Fragment key={a.api_slug}>
                <Form.TextField
                  id={a.api_slug + ":first"}
                  title="First Name"
                  info={info}
                  error={error}
                  value={String(current[a.api_slug + ":first"] ?? "")}
                  onChange={set(a.api_slug + ":first")}
                />
                <Form.TextField
                  id={a.api_slug + ":last"}
                  title="Last Name"
                  value={String(current[a.api_slug + ":last"] ?? "")}
                  onChange={set(a.api_slug + ":last")}
                />
              </Fragment>
            );
          case "actor-reference":
            if (!canListMembers)
              return (
                <Form.Description
                  key={a.api_slug}
                  title={a.title}
                  text={`Picking a member needs the user_management:read scope on your token${a.is_required ? " — required to create" : ""}.`}
                />
              );
            // ponytail: single-value dropdown even for multiselect actor
            // attributes; upgrade to a member TagPicker if one ever needs it.
            return (
              <Form.Dropdown
                key={a.api_slug}
                id={a.api_slug}
                title={a.title}
                info={info}
                error={error}
                value={String(val ?? "")}
                onChange={set(a.api_slug)}
              >
                {!a.is_required && <Form.Dropdown.Item value="" title="—" />}
                {members.all.map((m) => (
                  <Form.Dropdown.Item key={m.id} value={m.id} title={m.name} icon={Icon.Person} />
                ))}
              </Form.Dropdown>
            );
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
                info={info}
                error={error}
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
              const selected = Array.isArray(val) ? (val as string[]) : [];
              return (
                <Form.TagPicker
                  key={a.api_slug}
                  id={a.api_slug}
                  title={a.title}
                  info={info}
                  error={error}
                  value={selected}
                  onChange={set(a.api_slug)}
                >
                  {[...new Set([...opts, ...selected])].map((o) => (
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
                info={info}
                error={error}
                value={String(val ?? "")}
                onChange={set(a.api_slug)}
              >
                {!a.is_required && <Form.Dropdown.Item value="" title="—" />}
                {/* Union in a restored draft value whose option was renamed/archived
                    since — it stays visible instead of silently showing empty. */}
                {[...new Set([...opts, ...(typeof val === "string" && val !== "" ? [val] : [])])].map((o) => (
                  <Form.Dropdown.Item key={o} value={o} title={o} />
                ))}
              </Form.Dropdown>
            );
          }
          default:
            if (a.is_multiselect)
              return (
                <TagInput
                  key={a.api_slug}
                  attr={a}
                  values={Array.isArray(val) ? (val as string[]) : []}
                  onChange={set(a.api_slug)}
                  onPendingChange={(t) => {
                    pendingTags.current[a.api_slug] = t;
                    setErrors((e) => (e[a.api_slug] ? { ...e, [a.api_slug]: undefined } : e));
                  }}
                  info={info}
                  error={error}
                  initialPending={pendingTags.current[a.api_slug]}
                />
              );
            return (
              <Form.TextField
                key={a.api_slug}
                id={a.api_slug}
                title={a.title}
                info={info}
                error={error}
                value={String(val ?? "")}
                onChange={set(a.api_slug)}
              />
            );
        }
      })}
    </Form>
  );
}
