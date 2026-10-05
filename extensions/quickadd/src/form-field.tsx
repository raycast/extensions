import { Form, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import { LinkPicker, TagPicker } from "./completion-pickers";
import {
  insertLink,
  insertTag,
  linkTriggerAt,
  tagTriggerAt,
} from "./lib/completion";
import type { FieldSpec } from "./lib/fields";
import type { Vault } from "./lib/vaults";

export function customItemId(id: string): string {
  return `${id}-custom`;
}

function parseDate(value: string | undefined): Date | undefined {
  const date = value ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
}

export function FieldControl({
  spec,
  vault,
  id,
  error,
  onChange,
}: {
  spec: FieldSpec;
  vault: Vault;
  id: string;
  error?: string;
  onChange: () => void;
}) {
  const title = spec.optional ? `${spec.label} (Optional)` : spec.label;
  const common = { id, title, info: spec.description, error, onChange };

  switch (spec.kind) {
    case "text":
      return <TextControl {...common} spec={spec} vault={vault} />;
    case "number":
      return <NumberControl {...common} spec={spec} />;
    case "date":
      return (
        <Form.DatePicker
          {...common}
          defaultValue={parseDate(spec.defaultValue)}
          type={
            spec.withTime
              ? Form.DatePicker.Type.DateTime
              : Form.DatePicker.Type.Date
          }
        />
      );
    case "select": {
      const listed = spec.options.some((o) => o.value === spec.defaultValue);
      return (
        <>
          <Form.Dropdown
            {...common}
            defaultValue={listed ? spec.defaultValue : undefined}
          >
            {spec.notePicker && (
              <Form.Dropdown.Item
                value=""
                title={spec.optional ? "None" : "Select..."}
              />
            )}
            {spec.options.map((option, index) => (
              <Form.Dropdown.Item
                key={`${option.value}-${index}`}
                value={option.value}
                title={option.title}
              />
            ))}
          </Form.Dropdown>
          {spec.allowCustom && (
            <Form.TextField
              id={customItemId(id)}
              title={`${spec.label} (Custom)`}
              placeholder="Overrides the selection above"
              defaultValue={listed ? undefined : spec.defaultValue}
              onChange={onChange}
            />
          )}
        </>
      );
    }
    case "multi":
      return (
        <>
          <Form.TagPicker {...common} defaultValue={spec.preselected}>
            {spec.options.map((option, index) => (
              <Form.TagPicker.Item
                key={`${option.value}-${index}`}
                value={option.value}
                title={option.title}
              />
            ))}
          </Form.TagPicker>
          {spec.allowCustom && (
            <Form.TextField
              id={customItemId(id)}
              title={`${spec.label} (Custom)`}
              placeholder="Comma-separated values"
              onChange={onChange}
            />
          )}
        </>
      );
  }
}

// Controlled: Raycast clears an uncontrolled text field when the form
// re-renders with its error, so a rejected value would vanish.
function NumberControl({
  spec,
  onChange,
  ...item
}: {
  spec: Extract<FieldSpec, { kind: "number" }>;
  id: string;
  title: string;
  info?: string;
  error?: string;
  onChange: () => void;
}) {
  const [value, setValue] = useState(spec.defaultValue ?? "");
  return (
    <Form.TextField
      {...item}
      placeholder={spec.placeholder ?? "Number"}
      value={value}
      onChange={(next) => {
        onChange();
        setValue(next);
      }}
    />
  );
}

function TextControl({
  spec,
  vault,
  onChange,
  ...item
}: {
  spec: Extract<FieldSpec, { kind: "text" }>;
  vault: Vault;
  id: string;
  title: string;
  info?: string;
  error?: string;
  onChange: () => void;
}) {
  const [value, setValue] = useState(spec.defaultValue ?? "");
  const ref = useRef<Form.TextField>(null);
  const { push, pop } = useNavigation();
  // Raycast leaves the form unfocused after a pushed view pops.
  const focus = () => ref.current?.focus();

  function handleChange(next: string) {
    onChange();
    setValue(next);
    const link = linkTriggerAt(value, next);
    if (link !== undefined) {
      push(
        <LinkPicker
          vault={vault}
          onClose={focus}
          onPick={(picked) => {
            setValue(insertLink(next, link, picked.text));
            pop();
          }}
        />,
      );
      return;
    }
    const tag = tagTriggerAt(value, next);
    if (tag !== undefined) {
      push(
        <TagPicker
          vault={vault}
          onClose={focus}
          onPick={(picked) => {
            setValue(insertTag(next, tag, picked.tag));
            pop();
          }}
        />,
      );
    }
  }

  const props = {
    ...item,
    ref,
    placeholder: spec.placeholder,
    value,
    onChange: handleChange,
  };
  return spec.multiline ? (
    <Form.TextArea {...props} />
  ) : (
    <Form.TextField {...props} />
  );
}
