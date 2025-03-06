import React, { forwardRef } from "react";
import { Form, FormItemRef } from "@raycast/api";
import { DataModelField } from "../services/zod/schema/recordFieldSchema";
import { randomUUID } from "crypto";
import { optionIcons } from "../enum/icons";

type SelectProps = {
  field: DataModelField;
};

// Use forwardRef to allow ref forwarding
const Select = forwardRef<FormItemRef, { values: SelectProps } & React.ComponentProps<typeof Form.Dropdown>>(
  ({ values, ...rest }, ref) => {
    const { field } = values;
    const { options } = field;
    const defaultValue = field.defaultValue ? field.defaultValue.replace(/^'|'$/g, "") : "";
    const { id, value, ...modifiedRest } = rest; // eslint-disable-line @typescript-eslint/no-unused-vars

    return (
      <Form.Dropdown
        title={field.label}
        defaultValue={defaultValue}
        id={field.name}
        ref={ref as React.Ref<FormItemRef>}
        {...modifiedRest}
      >
        <Form.Dropdown.Item
          key={randomUUID().toString()}
          value={""}
          title={`No ${field.label}`}
          icon={optionIcons["white"]}
        />
        {options?.map((option) => (
          <Form.Dropdown.Item
            key={option.id}
            value={option.value ?? ""}
            title={option.label ?? ""}
            icon={optionIcons[option?.color ?? ""] ?? undefined}
          />
        ))}
      </Form.Dropdown>
    );
  },
);

// Set display name for better debugging
Select.displayName = "Select";

export default Select;
