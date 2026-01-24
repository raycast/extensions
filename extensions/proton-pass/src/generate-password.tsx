import { Action, ActionPanel, Form } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import { getRandomPassword } from "./helpers/helper";

enum Charset {
  Lowercase = "abcdefghijklmnopqrstuvwxyz",
  Uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  Numbers = "0123456879",
  SpecialChars = "~!@#$%^&*-",
}

interface PassGenProps {
  passwordLength: string;
  capitalLetters: boolean;
  numbers: boolean;
  specials: boolean;
}

function validatePasswordLength(pwlen: string): string {
  if (pwlen.length == 0) {
    return "password length must be greater than zero!";
  }

  const result = Number(pwlen);
  if (Number.isNaN(result) || !Number.isInteger(result)) {
    return "password length must be an integer";
  }

  return "";
}

const buildCharset = (capital: boolean, number: boolean, special: boolean) => {
  let charset: string = Charset.Lowercase; // Always include lowercase
  if (capital) charset += Charset.Uppercase;
  if (number) charset += Charset.Numbers;
  if (special) charset += Charset.SpecialChars;
  return charset;
};

export default function Component() {
  const [length, setLength] = useState(16);
  const [displayPassword, setDisplayPassword] = useState(getRandomPassword(length, Charset.Lowercase));
  const [isCapital, setCapital] = useState(false);
  const [isNumber, setNumber] = useState(false);
  const [isSpecial, setSpecial] = useState(false);

  const { handleSubmit, itemProps } = useForm<PassGenProps>({
    onSubmit: function () {},
    validation: {
      passwordLength: (value) => {
        if (value == undefined) return "";
        return validatePasswordLength(value);
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy to Clipboard" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Separator />
      <Form.Description title="Current Password" text={displayPassword} />
      <Form.Separator />
      <Form.TextField
        title="Password Length"
        {...itemProps.passwordLength}
        onChange={(newValue) => {
          if (validatePasswordLength(newValue) != "") {
            setDisplayPassword("<ENTER_A_VALID_LENGTH>");
          } else {
            const newLength = parseInt(newValue);
            setLength(newLength);
            const charset = buildCharset(isCapital, isNumber, isSpecial);
            const newPassword = getRandomPassword(newLength, charset);
            setDisplayPassword(newPassword);
          }
        }}
      />
      <Form.Checkbox
        label="Capital Letters"
        value={isCapital}
        {...itemProps.capitalLetters}
        onChange={(newValue) => {
          setCapital(newValue);
          const charset = buildCharset(newValue, isNumber, isSpecial);
          const newPassword = getRandomPassword(length, charset);
          setDisplayPassword(newPassword);
        }}
      />
      <Form.Checkbox
        label="Numbers"
        value={isNumber}
        {...itemProps.numbers}
        onChange={(newValue) => {
          setNumber(newValue);
          const charset = buildCharset(isCapital, newValue, isSpecial);
          const newPassword = getRandomPassword(length, charset);
          setDisplayPassword(newPassword);
        }}
      />
      <Form.Checkbox
        label="Special Characters"
        value={isSpecial}
        {...itemProps.specials}
        onChange={(newValue) => {
          setSpecial(newValue);
          const charset = buildCharset(isCapital, isNumber, newValue);
          const newPassword = getRandomPassword(length, charset);
          setDisplayPassword(newPassword);
        }}
      />
    </Form>
  );
}
