import { useState, Fragment } from "react";
import { ActionPanel, Action, Form, Detail, showToast, Clipboard, Toast } from "@raycast/api";

import { generatePassword } from "./helpers/helpers";

export default function Command() {
  type Password = string | null | undefined;
  const [password, setPassword] = useState<Password>();
  const [error, isError] = useState<boolean>(false);

  let errorMessage = "";

  const handleGeneratePassword = (values: any) => {
    const length = values.lengthinput;
    const lengthNumber = parseInt(length, 10);

    const useNumbers = values.usenumbers === 1 ? true : false;
    const useChars = values.usechars === 1 ? true : false;

    if (Number.isFinite(lengthNumber) && lengthNumber > 4 && lengthNumber < 65) {
      const generatedPassword = generatePassword(lengthNumber, useNumbers, useChars);
      setPassword(generatedPassword);
      values = {};
      Clipboard.copy(generatedPassword);
      showToast(Toast.Style.Success, "Copied Password", generatedPassword);
    } else {
      isError(true);
      setPassword("Error");
      if (lengthNumber < 5) {
        errorMessage = "Password length must be greater than 4";
      } else if (lengthNumber > 64) {
        errorMessage = "Password length must be less than 65";
      } else if (!Number.isFinite(lengthNumber)) {
        errorMessage = "Password length must be a number";
      }
    }
  };

  return (
    <>
      <Form
        navigationTitle="Password Generator"
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Generate Password" onSubmit={(values) => handleGeneratePassword(values)} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="lengthinput"
          title="Enter password length (number of characters):"
          placeholder="Enter a number between 5 and 64"
        />
        <Form.Checkbox id="usenumbers" label="Use numbers?" defaultValue={true} />
        <Form.Checkbox id="usechars" label="Use special characters?" defaultValue={true} />
      </Form>
      {password && !error && (
        <Detail
          markdown={`### Generated Password copied to clipboard!`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={password} />
            </ActionPanel>
          }
        />
      )}
      {error && <Detail markdown={`### Error: please enter a valid number between 5 and 64`} />}
    </>
  );
}
