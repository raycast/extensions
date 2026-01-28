import React, { forwardRef } from "react";
import { Form, FormItemRef } from "@raycast/api";
import { DataModelField } from "../services/zod/schema/recordFieldSchema";

type RatingProps = {
  field: DataModelField;
};

// Use forwardRef to allow ref forwarding
const Rating = forwardRef<FormItemRef, { values: RatingProps }>(({ values, ...rest }, ref) => {
  const { field } = values;

  // Generate star rating options (1 to 5)
  const options = Array.from({ length: 5 }, (_, i) => ({
    title: "⭐️".repeat(i + 1),
    value: `RATING_${i + 1}`,
  }));

  return (
    <Form.Dropdown title={field.label} id={field.name} ref={ref as React.Ref<FormItemRef>} {...rest}>
      <Form.Dropdown.Item key={"NO_RATING"} value={""} title={`No ${field.label}`} />
      {options.map((option) => (
        <Form.Dropdown.Item key={option.value} value={option.value ?? ""} title={option.title ?? ""} />
      ))}
    </Form.Dropdown>
  );
});

// Set display name for better debugging
Rating.displayName = "Rating";

export default Rating;
