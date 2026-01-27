import { HAArea } from "@components/area/utils";
import { HADevice } from "@components/device/utils";
import { State } from "@lib/haapi";
import { getFriendlyName } from "@lib/utils";
import { Form } from "@raycast/api";
import { parse } from "yaml";
import { getNameOfHAServiceField, HAServiceField, HAServiceTargetArea, HAServiceTargetEntity } from "./utils";

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
      {states?.map((s) => (
        <Form.TagPicker.Item value={s.entity_id} title={`${getFriendlyName(s)} (${s.entity_id})`} />
      ))}
    </Form.TagPicker>
  );
}

export interface ServiceFormFieldNumberProps extends Form.TextField.Props {
  field: HAServiceField;
}

export function ServiceFormFieldNumber({ onChange, value, field, id, ...restProps }: ServiceFormFieldNumberProps) {
  if (field.selector?.number === undefined && field.selector?.color_temp === undefined) {
    return null;
  }
  const handle = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
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
      {labeledOpts?.map((o) => (
        <Form.Dropdown.Item key={o.value} value={o.value} title={o.label} />
      ))}
    </Form.Dropdown>
  );
}

export interface ServiceFormFieldObjectProps extends Form.TextArea.Props {
  field: HAServiceField;
}

export function ServiceFormFieldObject({ id, field, value, ...restProps }: ServiceFormFieldObjectProps) {
  const error = () => {
    try {
      if (value) {
        parse(value);
      }
    } catch (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      error
    ) {
      return "Invalid yaml";
    }
  };
  return (
    <Form.TextArea
      id={id}
      title={`${getNameOfHAServiceField(field, id)} (yaml)`}
      value={value}
      error={error()}
      placeholder={field.description}
      {...restProps}
    />
  );
}

export interface ServiceFormTargetEntitiesTagPickerProps extends Form.TagPicker.Props {
  states: State[] | undefined;
  target?: HAServiceTargetEntity[] | null;
}

function isEmptyTarget(target: HAServiceTargetEntity[]) {
  // check if target is [{}] which should fitler all entities
  return target.length === 1 && Object.keys(target[0]).length <= 0;
}

export function ServiceFormTargetEntitiesTagPicker({
  id,
  states,
  target,
  value,
  ...restProps
}: ServiceFormTargetEntitiesTagPickerProps) {
  const filteredStates =
    target && !isEmptyTarget(target)
      ? states?.filter((s) => {
          for (const t of target) {
            if (t.domain) {
              const domain = s.entity_id.split(".")[0];
              if (t.domain.includes(domain)) {
                return true;
              }
            }
            // TODO check integration as well
          }
          return false;
        })
      : states;
  return (
    <Form.TagPicker
      id={id}
      title="Target Entities"
      placeholder="Target Entities"
      {...restProps}
      defaultValue={value ?? []}
    >
      {filteredStates?.map((s) => (
        <Form.TagPicker.Item key={s.entity_id} value={s.entity_id} title={`${getFriendlyName(s)} (${s.entity_id})`} />
      ))}
    </Form.TagPicker>
  );
}

export interface ServiceFormTargetAreaTagPickerProps extends Form.TagPicker.Props {
  areas: HAArea[] | undefined;
  target?: HAServiceTargetArea[] | null;
}

export function ServiceFormTargetAreaTagPicker({
  id,
  areas,
  value,
  ...restProps
}: ServiceFormTargetAreaTagPickerProps) {
  return (
    <Form.TagPicker id={id} title="Target Area" placeholder="Target Area" {...restProps} defaultValue={value ?? []}>
      {areas?.map((s) => (
        <Form.TagPicker.Item key={s.area_id} value={s.area_id} title={s.name ?? s.area_id} />
      ))}
    </Form.TagPicker>
  );
}

export interface ServiceFormTargetDeviceTagPickerProps extends Form.TagPicker.Props {
  devices: HADevice[] | undefined;
  target?: HAServiceTargetArea[] | null;
}

export function ServiceFormTargetDeviceTagPicker({
  id,
  devices,
  value,
  ...restProps
}: ServiceFormTargetDeviceTagPickerProps) {
  return (
    <Form.TagPicker id={id} title="Target Device" placeholder="Target Device" {...restProps} defaultValue={value ?? []}>
      {devices?.map((s) => (
        <Form.TagPicker.Item key={s.id} value={s.id} title={s.name && s.name.trim().length > 0 ? s.name : s.id} />
      ))}
    </Form.TagPicker>
  );
}

export interface ServiceFormFieldAreaProps extends Form.TagPicker.Props {
  field: HAServiceField;
  areas: HAArea[] | undefined;
}

export function ServiceFormFieldArea({ id, areas, field, value, ...restProps }: ServiceFormFieldAreaProps) {
  return (
    <Form.TagPicker id={id} title={getNameOfHAServiceField(field, id)} {...restProps} defaultValue={value ?? []}>
      {areas?.map((s) => (
        <Form.TagPicker.Item key={s.area_id} value={s.area_id} title={s.name ?? s.area_id} />
      ))}
    </Form.TagPicker>
  );
}
