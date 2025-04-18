import { Action, ActionPanel, Clipboard, Form, showToast, Toast } from "@raycast/api";
import { calculateCharsetSize, calculateEntropy, generatePassword } from "./helper";
import { useState } from "react";
import { PasswordForm } from "./PasswordForm";

const MIN_ENTROPY_BITS = 80;

const PASSWORD_CONSTRAINTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 32,
  DEFAULT_LENGTH: 20,
  SPECIAL_CHARS: "~․!@#$%^&*()_-+=[][]|\\;:'\"<>,.?/",
} as const;

const validateLength = (value: string): boolean => {
  const length = parseInt(value, 10);
  return !isNaN(length) && length >= PASSWORD_CONSTRAINTS.MIN_LENGTH && length <= PASSWORD_CONSTRAINTS.MAX_LENGTH;
};

const validateCustomChars = (value: string): boolean => {
  if (!value) return true;
  return [...value].every((char) => PASSWORD_CONSTRAINTS.SPECIAL_CHARS.includes(char));
};

const ERROR_MESSAGES = {
  INVALID_LENGTH: "Please enter a number.",
  LENGTH_RANGE: "The length must be between 8 and 32.",
  INVALID_SPECIAL_CHARS: "Please enter only allowed special characters.",
} as const;

export async function handleSubmit(values: PasswordForm) {
  const length = parseInt(values.length, 10) || PASSWORD_CONSTRAINTS.DEFAULT_LENGTH;

  const generatedPassword = generatePassword(
    length,
    values.useNumbers,
    values.useUpper,
    values.useChars,
    values.customChars,
  );

  await Clipboard.copy(generatedPassword);
  await showToast(Toast.Style.Success, "Copied to Clipboard!", generatedPassword);

  const charsetSize = calculateCharsetSize(values);
  const entropy = calculateEntropy(generatedPassword, charsetSize);

  if (entropy < MIN_ENTROPY_BITS) {
    await showToast(Toast.Style.Success, "Copied, but consider using a stronger password!", generatedPassword);
  }
}

export default function Command() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: string, value: string) => {
    switch (field) {
      case "length":
        if (!value) return;
        if (isNaN(parseInt(value, 10))) {
          setErrors((prev) => ({ ...prev, length: ERROR_MESSAGES.INVALID_LENGTH }));
        } else if (!validateLength(value)) {
          setErrors((prev) => ({ ...prev, length: ERROR_MESSAGES.LENGTH_RANGE }));
        } else {
          setErrors((prev) => ({ ...prev, length: "" }));
        }
        break;
      case "customChars":
        if (!value) return;
        if (!validateCustomChars(value)) {
          setErrors((prev) => ({ ...prev, customChars: ERROR_MESSAGES.INVALID_SPECIAL_CHARS }));
        } else {
          setErrors((prev) => ({ ...prev, customChars: "" }));
        }
        break;
    }
  };

  return (
    <Form
      navigationTitle="Password Generator"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="length"
        title="Enter password length"
        placeholder={`Enter a number between ${PASSWORD_CONSTRAINTS.MIN_LENGTH} and ${PASSWORD_CONSTRAINTS.MAX_LENGTH} (default: ${PASSWORD_CONSTRAINTS.DEFAULT_LENGTH})`}
        error={errors.length}
        onChange={(value) => validateField("length", value)}
        onBlur={(event) => {
          const value = event.target.value;
          if (value) validateField("length", value);
        }}
      />
      <Form.TextField
        id="customChars"
        title="Custom special characters"
        placeholder="Defaults used if blank"
        error={errors.customChars}
        onChange={(value) => validateField("customChars", value)}
        onBlur={(event) => {
          const value = event.target.value;
          if (value) validateField("customChars", value);
        }}
      />
      <Form.Checkbox id="useNumbers" label="Include numbers?" defaultValue={true} />
      <Form.Checkbox id="useUpper" label="Include uppercase letters?" defaultValue={true} />
      <Form.Checkbox id="useChars" label="Include special characters?" defaultValue={true} />
    </Form>
  );
}
