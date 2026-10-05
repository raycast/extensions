import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useState } from "react";
import { dateDefault, dropdownDefault, FieldSpec, FormValues, validateForm } from "../replies";
import { VaultRef } from "../suggestions";
import CancelAction from "./CancelAction";
import LinkingTextField from "./LinkingTextField";

type Props = {
  title: string;
  vault: VaultRef;
  specs: FieldSpec[];
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
};

export default function FormPrompt({ title, vault, specs, onSubmit, onCancel }: Props) {
  const [errors, setErrors] = useState<Record<number, string>>({});

  function submit(values: FormValues) {
    const found = validateForm(specs, values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    onSubmit(values);
  }

  function clear(index: number) {
    if (!errors[index]) return;
    const next = { ...errors };
    delete next[index];
    setErrors(next);
  }

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Continue" icon={Icon.Checkmark} onSubmit={submit} />
          <CancelAction onCancel={onCancel} />
        </ActionPanel>
      }
    >
      {specs.flatMap((spec, index) => renderField(spec, index, vault, errors[index], () => clear(index)))}
    </Form>
  );
}

function renderField(spec: FieldSpec, index: number, vault: VaultRef, error: string | undefined, onChange: () => void) {
  const id = `f${index}`;
  const common = { id, title: spec.label, info: spec.info, error, onChange };
  const text = typeof spec.defaultValue === "string" ? spec.defaultValue : undefined;
  const custom = (placeholder: string) =>
    spec.allowCustom
      ? [<Form.TextField key={`${id}-custom`} id={`${id}-custom`} title="" placeholder={placeholder} />]
      : [];

  switch (spec.kind) {
    case "textarea":
      return [
        <LinkingTextField
          key={id}
          {...common}
          vault={vault}
          multiline
          placeholder={spec.placeholder}
          defaultValue={text}
          autoFocus={index === 0}
        />,
      ];
    case "dropdown":
      return [
        <Form.Dropdown key={id} {...common} defaultValue={dropdownDefault(spec)}>
          {spec.optional && !(spec.options ?? []).some((option) => option.value === "") ? (
            <Form.Dropdown.Item key="__qa-none" value="" title="—" />
          ) : null}
          {(spec.options ?? []).map((option) => (
            <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </Form.Dropdown>,
        ...custom("Or type a custom value"),
      ];
    case "tags":
      return [
        <Form.TagPicker key={id} {...common} defaultValue={Array.isArray(spec.defaultValue) ? spec.defaultValue : []}>
          {(spec.options ?? []).map((option) => (
            <Form.TagPicker.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </Form.TagPicker>,
        ...custom("Other values, comma-separated"),
      ];
    case "date":
      return [
        <Form.DatePicker
          key={id}
          {...common}
          type={spec.withTime ? Form.DatePicker.Type.DateTime : Form.DatePicker.Type.Date}
          defaultValue={dateDefault(spec.defaultValue)}
        />,
      ];
    case "checkbox":
      return [
        <Form.Checkbox
          key={id}
          id={id}
          label={spec.label}
          info={spec.info}
          error={error}
          onChange={onChange}
          defaultValue={spec.defaultValue === true}
        />,
      ];
    default:
      return [
        <LinkingTextField
          key={id}
          {...common}
          vault={vault}
          placeholder={spec.placeholder ?? (spec.optional ? "Optional" : undefined)}
          defaultValue={text}
          autoFocus={index === 0}
        />,
      ];
  }
}
