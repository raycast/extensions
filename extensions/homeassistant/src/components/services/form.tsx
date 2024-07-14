import { Form } from "@raycast/api";
import { getNameOfHAServiceField, HAServiceField } from "./utils";
import { State } from "@lib/haapi";
import { getFriendlyName } from "@lib/utils";

export interface ServiceFormFieldEntitiesTagPickerProps extends Form.TagPicker.Props {
  field: HAServiceField;
  states: State[] | undefined;
}

export function ServiceFormFieldEntitiesTagPicker({ id, states, field }: ServiceFormFieldEntitiesTagPickerProps) {
  if (field.selector?.entity === undefined) {
    return null;
  }
  return (
    <Form.TagPicker id={id} title={getNameOfHAServiceField(field, id)}>
      {states?.map((s) => <Form.TagPicker.Item value={s.entity_id} title={`${getFriendlyName(s)} (${s.entity_id})`} />)}
    </Form.TagPicker>
  );
}

export interface ServiceFormFieldNumberProps extends Form.TextField.Props {
  field: HAServiceField;
}

export function ServiceFormFieldNumber({ onChange, value, field, id, ...restProps }: ServiceFormFieldNumberProps) {
  if (field.selector?.number === undefined) {
    return null;
  }
  const handle = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    }
  };
  const error = () => {
    if (value === undefined || value === null || value.trim().length <= 0) {
      return;
    }
    if (Number.isNaN(parseFloat(value))) {
      return "Not a number";
    }
  };
  return (
    <Form.TextField
      id={id}
      onChange={handle}
      title={getNameOfHAServiceField(field, id)}
      placeholder={field.description}
      value={value !== undefined && value !== null && !Number.isNaN(value) ? `${value}` : undefined}
      {...restProps}
      error={error()}
    ></Form.TextField>
  );
}

export interface ServiceFormFieldSelectDropdownProps extends Form.Dropdown.Props {
  field: HAServiceField;
}

export function ServiceFormFieldSelectDropdown({ id, field }: ServiceFormFieldSelectDropdownProps) {
  if (field.selector?.select === undefined) {
    return null;
  }
  const opts = field.selector?.select?.options;
  if (opts === undefined || opts === null || opts.length <= 0) {
    return null;
  }
  const labeledOpts = opts.map((o) => (typeof o === "string" ? { label: o, value: o } : o));
  return (
    <Form.Dropdown id={id} title={getNameOfHAServiceField(field, id)}>
      {labeledOpts?.map((o) => <Form.Dropdown.Item key={o.value} value={o.value} title={o.label} />)}
    </Form.Dropdown>
  );
}
