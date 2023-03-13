import { Form } from "@raycast/api";
import { useState } from "react";
import { PasswordGeneratorOptions, PasswordOptionField } from "~/types/passwords";

export type GeneratePasswordOptionFieldProps = {
  field: PasswordOptionField;
  option: keyof PasswordGeneratorOptions;
  defaultValue: PasswordGeneratorOptions[keyof PasswordGeneratorOptions];
  onChange: (value: PasswordGeneratorOptions[keyof PasswordGeneratorOptions]) => void;
  errorMessage?: string;
};

function GeneratePasswordOptionField({
  option,
  defaultValue = "",
  onChange: handleChange,
  errorMessage,
  field,
}: GeneratePasswordOptionFieldProps) {
  const { hint = "", label, type } = field;
  const [error, setError] = useState<string>();

  const handleTextFieldChange = (value: string) => {
    if (isValidFieldValue(option, value)) {
      handleChange(value);
      setError(undefined);
    } else {
      setError(errorMessage);
    }
  };

  if (type === "boolean") {
    return (
      <Form.Checkbox
        key={option}
        id={option}
        title={label}
        label={hint}
        defaultValue={Boolean(defaultValue)}
        onChange={handleChange}
      />
    );
  }

  return (
    <Form.TextField
      key={option}
      id={option}
      title={label}
      placeholder={hint}
      defaultValue={String(defaultValue)}
      onChange={handleTextFieldChange}
      error={error}
    />
  );
}

function isValidFieldValue<O extends keyof PasswordGeneratorOptions>(field: O, value: PasswordGeneratorOptions[O]) {
  if (field === "length") return !isNaN(Number(value)) && Number(value) >= 5 && Number(value) <= 128;
  if (field === "separator") return (value as string).length === 1;
  if (field === "words") return !isNaN(Number(value)) && Number(value) >= 3 && Number(value) <= 20;
  return true;
}

export default GeneratePasswordOptionField;
