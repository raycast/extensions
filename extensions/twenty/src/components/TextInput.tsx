import React, { forwardRef } from "react";
import { Form, FormItemRef } from "@raycast/api";
import { DataModelField } from "../services/zod/schema/recordFieldSchema";

type TitleProps = {
  defaultValue?: string;
  field: DataModelField;
  placeholder?: string;
};

// Use forwardRef to allow ref forwarding
const TextInput = forwardRef<FormItemRef, { values: TitleProps }>(({ values, ...rest }, ref) => {
  const { defaultValue, field, placeholder } = values;

  return (
    <Form.TextField
      id={field.name}
      title={field.label}
      placeholder={placeholder}
      defaultValue={defaultValue}
      ref={ref as React.Ref<FormItemRef>} // Cast the ref to the correct type
      {...rest}
    />
  );
});

// Set display name for better debugging
TextInput.displayName = "TextInput";

export default TextInput;
