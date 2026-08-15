import { Form } from "@raycast/api";
import { forwardRef } from "react";
import { createColorIcon } from "../../utils/color.js";
import { PROJECT_COLORS } from "../../utils/constants.js";

export const ColorDropdown = forwardRef<Form.ItemReference, Form.Dropdown.Props>((props, ref) => {
  return (
    <Form.Dropdown ref={ref} title="Color" {...props}>
      {PROJECT_COLORS.map((color) => (
        <Form.Dropdown.Item key={color} value={color} title={color} icon={createColorIcon(color)} />
      ))}
    </Form.Dropdown>
  );
});
