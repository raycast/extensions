import React, { forwardRef } from "react";
import { Form, FormItemRef } from "@raycast/api";
import { DataModelField } from "../services/zod/schema/recordFieldSchema";
import { optionIcons } from "../enum/icons";

type MultiSelectProps = {
  field: DataModelField;
  placeholder?: string;
};

// Use forwardRef for consistency and ref handling
const MultiSelect = forwardRef<FormItemRef, { values: MultiSelectProps } & React.ComponentProps<typeof Form.TagPicker>>(
  ({ values, ...rest }, ref) => {
    const { field, placeholder } = values;
    const { options } = field;

    const defaultValue = Array.isArray(field.defaultValue)
      ? field.defaultValue.map((value) => value.replace(/^'|'$/g, "").trim())
      : field.defaultValue
        ? [field.defaultValue.replace(/^'|'$/g, "").trim()]
        : [];

    const { id, value, ...modifiedRest } = rest; // eslint-disable-line @typescript-eslint/no-unused-vars

    return (
      <Form.TagPicker
        title={field.label}
        placeholder={placeholder}
        defaultValue={defaultValue}
        id={field.name}
        ref={ref as React.Ref<FormItemRef>}
        {...modifiedRest}
      >
        {options?.map((option) => (
          <Form.TagPicker.Item
            key={option.id}
            value={option.value ?? ""}
            title={option.label ?? ""}
            icon={optionIcons[option?.color ?? ""] ?? undefined}
          />
        ))}
      </Form.TagPicker>
    );
  },
);

// Set display name for better debugging
MultiSelect.displayName = "MultiSelect";

export default MultiSelect;
