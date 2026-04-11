import React, { forwardRef } from "react";
import { Form, FormItemRef, ItemProps } from "@raycast/api";
import { DataModelField } from "../services/zod/schema/recordFieldSchema";

type BooleanFieldProps = {
  field: DataModelField;
  itemProps: Record<string, ItemProps>;
};

const BooleanField = forwardRef<FormItemRef, BooleanFieldProps>(({ field, itemProps }, ref) => {
  const checkboxProps = { ...(itemProps[field.name] ?? {}) } as Record<string, unknown>;
  delete checkboxProps.id;

  return <Form.Checkbox id={field.name} label={field.label} ref={ref as React.Ref<FormItemRef>} {...checkboxProps} />;
});

BooleanField.displayName = "BooleanField";

export default BooleanField;
