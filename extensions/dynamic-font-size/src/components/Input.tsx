import { Form } from "@raycast/api";

export type IInputProps = {
  id: string;
  title: string;
  placeholder?: string;
  value?: string | undefined;
  onChange(value: string): void;
};

function Input({ id, title, placeholder, value, onChange: handleChange }: IInputProps) {
  const handleTextFieldChange = async (value: string) => {
    // Convert string to only allow numbers, decimals and remove '0' if it's the first character
    const converted = value.replace(/^[0](\d+)/, "$1").replace(/[^\d.,]/g, "");

    // Check if value is present, otherwise fall back to zero
    if (converted) {
      handleChange(converted);
    } else {
      handleChange("0");
    }
  };

  return (
    <Form.TextField id={id} title={title} placeholder={placeholder} value={value} onChange={handleTextFieldChange} />
  );
}

export default Input;
