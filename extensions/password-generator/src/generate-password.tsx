import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  PopToRootType,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";

import { generatePassword } from "@/helpers/helpers";

interface Preferences {
  hideAfterCopy: boolean;
  storePasswordLength: boolean;
}

interface Form {
  length: string;
  useNumbers: 1 | 0;
  useChars: 1 | 0;
}

const handleGeneratePassword = (values: Form) => {
  const { hideAfterCopy } = getPreferenceValues<Preferences>();

  const length = values.length;
  const lengthNumber = parseInt(length, 10);

  const useNumbers = Boolean(values.useNumbers);
  const useChars = Boolean(values.useChars);

  if (!Number.isFinite(lengthNumber)) {
    showToast(Toast.Style.Failure, "Password length must be a number");
    return;
  }

  if (lengthNumber < 5) {
    showToast(Toast.Style.Failure, "Password length must be greater than 4");
    return;
  }

  if (lengthNumber > 64) {
    showToast(Toast.Style.Failure, "Password length must be less than 65");
    return;
  }

  const generatedPassword = generatePassword(lengthNumber, useNumbers, useChars);

  Clipboard.copy(generatedPassword);

  if (hideAfterCopy) {
    showHUD(`Copied Password - ${generatedPassword} 🎉`, {
      clearRootSearch: false,
      popToRootType: PopToRootType.Suspended,
    });
  } else {
    showToast(Toast.Style.Success, "Copied Password 🎉", generatedPassword);
  }
};

export default function Command() {
  const { storePasswordLength } = getPreferenceValues<Preferences>();

  return (
    <Form
      navigationTitle="Password Generator"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Password" onSubmit={(values: Form) => handleGeneratePassword(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="length"
        title="Enter password length (number of characters):"
        placeholder="Enter a number between 5 and 64"
        storeValue={storePasswordLength}
      />
      <Form.Checkbox id="useNumbers" label="Use numbers?" defaultValue={true} />
      <Form.Checkbox id="useChars" label="Use special characters?" defaultValue={true} />
    </Form>
  );
}
