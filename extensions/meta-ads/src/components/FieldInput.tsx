import { Form } from "@raycast/api";
import { useState } from "react";
import { DEFER_VALUE, formatCurrencyAmount, formatCurrencyOnChange, isDeferredValue } from "../lib/fields";
import { FieldDef } from "../lib/types";

interface Props {
  field: FieldDef;
  defaultValue?: string;
  allowDefer?: boolean;
}

function parseDateValue(value?: string): Date | undefined {
  if (!value || isDeferredValue(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function CurrencyField({ field, defaultValue, allowDefer }: Props) {
  const [value, setValue] = useState(() => {
    if (allowDefer && isDeferredValue(defaultValue)) return DEFER_VALUE;
    return formatCurrencyAmount(defaultValue);
  });

  return (
    <Form.TextField
      id={field.id}
      title={`₩ ${field.title}`}
      info={field.description}
      placeholder={allowDefer ? DEFER_VALUE : field.placeholder}
      value={value}
      onChange={(next) => setValue(formatCurrencyOnChange(next, allowDefer))}
    />
  );
}

export function FieldInput({ field, defaultValue, allowDefer }: Props) {
  const info = field.description;
  const placeholder = allowDefer ? DEFER_VALUE : field.placeholder;
  const deferredDefault = allowDefer && isDeferredValue(defaultValue) ? DEFER_VALUE : defaultValue;

  if (field.currency) {
    return <CurrencyField field={field} defaultValue={defaultValue} allowDefer={allowDefer} />;
  }

  switch (field.type) {
    case "textarea":
      return (
        <Form.TextArea
          id={field.id}
          title={field.title}
          info={info}
          placeholder={placeholder}
          defaultValue={deferredDefault}
        />
      );
    case "dropdown":
      return (
        <Form.Dropdown
          id={field.id}
          title={field.title}
          info={info}
          defaultValue={allowDefer ? deferredDefault : defaultValue || undefined}
        >
          {allowDefer ? <Form.Dropdown.Item value={DEFER_VALUE} title={DEFER_VALUE} /> : null}
          {!field.required && !allowDefer ? <Form.Dropdown.Item value="" title="선택 안 함" /> : null}
          {(field.options ?? []).map((option) => (
            <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </Form.Dropdown>
      );
    case "number":
      return (
        <Form.TextField
          id={field.id}
          title={field.title}
          info={info}
          placeholder={placeholder}
          defaultValue={deferredDefault}
        />
      );
    case "datetime":
      return (
        <Form.DatePicker
          id={field.id}
          title={field.title}
          info={allowDefer ? `${info ? `${info}. ` : ""}비워 두면 ${DEFER_VALUE}` : info}
          type={Form.DatePicker.Type.DateTime}
          defaultValue={parseDateValue(defaultValue)}
        />
      );
    default:
      return (
        <Form.TextField
          id={field.id}
          title={field.title}
          info={info}
          placeholder={placeholder}
          defaultValue={deferredDefault}
        />
      );
  }
}
