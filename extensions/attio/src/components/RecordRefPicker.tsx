import { useState } from "react";
import { Form } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { searchRecords } from "../api/endpoints";
import type { Attribute } from "../api/types";
import { cacheNs } from "../hooks/useSelf";

/** Dropdown values are strings; ":" can't appear in an object slug, so this encoding is unambiguous. */
export const encodeRef = (object: string, id: string) => `${object}:${id}`;
export const decodeRef = (v: string) => {
  const i = v.indexOf(":");
  return { target_object: v.slice(0, i), target_record_id: v.slice(i + 1) };
};

/** Async-search picker for a single record-reference (e.g. a person's Company). */
export default function RecordRefPicker(props: {
  attr: Attribute;
  allowedSlugs: string[];
  initial?: { value: string; title: string };
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const [text, setText] = useState("");
  // The picked item must survive later searches that no longer include it —
  // a controlled value whose item vanished would blank the dropdown.
  const [picked, setPicked] = useState(props.initial);
  const { data: hits, isLoading } = useCachedPromise(
    // _ns scopes the cache to the token fingerprint (workspace) — key-only.
    async (_ns: string, q: string, slugs: string) => {
      const objects = slugs.split(",").filter(Boolean);
      return q.trim() && objects.length > 0 ? (await searchRecords(q, objects)).data : [];
    },
    [cacheNs, text, props.allowedSlugs.join(",")],
    { keepPreviousData: true },
  );
  const items = new Map<string, string>();
  if (props.initial) items.set(props.initial.value, props.initial.title);
  if (picked) items.set(picked.value, picked.title);
  for (const h of hits ?? []) items.set(encodeRef(h.object_slug, h.id.record_id), h.record_text);
  return (
    <Form.Dropdown
      id={props.attr.api_slug}
      title={props.attr.title}
      isLoading={isLoading}
      throttle
      filtering={false}
      onSearchTextChange={setText}
      value={props.value}
      onChange={(v) => {
        const title = items.get(v);
        if (v && title) setPicked({ value: v, title });
        props.onChange(v);
      }}
      info="Type to search"
      error={props.error}
    >
      {/* Keep "—" when the field STARTED empty, even if required — the user
          must be able to revert an exploratory pick without abandoning the form. */}
      {(!props.attr.is_required || !props.initial) && <Form.Dropdown.Item value="" title="—" />}
      {[...items].map(([v, title]) => (
        <Form.Dropdown.Item key={v} value={v} title={title} />
      ))}
    </Form.Dropdown>
  );
}
