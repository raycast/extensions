import { Color, Form } from "@raycast/api";
import React from "react";

interface ColorDropdownProps {
  value: Color;
  onChange: (newValue: string) => void;
}

export function ColorDropdown({ value, onChange }: ColorDropdownProps) {
  return (
    <Form.Dropdown id="color" title="Color" value={value} onChange={onChange}>
      <Form.Dropdown.Item value={Color.Red} title="Red" />
      <Form.Dropdown.Item value={Color.Green} title="Green" />
      <Form.Dropdown.Item value={Color.Blue} title="Blue" />
      <Form.Dropdown.Item value={Color.Yellow} title="Yellow" />
      <Form.Dropdown.Item value={Color.Purple} title="Purple" />
      <Form.Dropdown.Item value={Color.Orange} title="Orange" />
      <Form.Dropdown.Item value={Color.Magenta} title="Magenta" />
    </Form.Dropdown>
  );
}
