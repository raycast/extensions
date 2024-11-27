import { Form } from "@raycast/api";
import { useState } from "react";

export type FormDropdownWithCustomProps = Form.Dropdown.Props &
  Required<Pick<Form.Dropdown.Props, "onChange">> & {
    isCustomFirst?: boolean;
  };

export function FormDropdownWithCustom(props: FormDropdownWithCustomProps) {
  const { children, id, title, onChange, isCustomFirst = false } = props;

  const [isCustom, setIsCustom] = useState(false);
  const [value, setValue] = useState<string | null>(null);

  const options = [
    children,
    value && <Form.Dropdown.Item key="custom-value" title={value} value={value} />,
    <Form.Dropdown.Item key="custom-option" title="Custom" value="custom" />,
  ];

  if (isCustomFirst) {
    options.reverse();
  }

  return (
    <>
      <Form.Dropdown
        {...props}
        onChange={(newValue) => {
          setIsCustom(newValue === "custom");
          onChange(newValue);
        }}
      >
        {...options}
      </Form.Dropdown>

      {isCustom && (
        <Form.TextField
          id={`dropdown-custom-${id}`}
          title={`Custom ${title}`}
          onChange={(newValue) => {
            setValue(newValue);
          }}
          onBlur={() => {
            if (value == null) {
              return;
            }

            setIsCustom(false);
            onChange(value!);
          }}
        />
      )}
    </>
  );
}
