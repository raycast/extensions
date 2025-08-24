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
import { useState } from "react";

import { generateCustomPassword } from "@/helpers/helpers";

interface Preferences {
  hideAfterCopy: boolean;
  rememberCustomFormat: boolean;
}

interface Form {
  length: string;
  useNumbers: 1 | 0;
  useChars: 1 | 0;
  useCustomFormat: 1 | 0;
  customFormat: string;
}

const handleGeneratePassword = (values: Form) => {
  const { hideAfterCopy } = getPreferenceValues<Preferences>();

  const generatedPassword = generateCustomPassword(values.customFormat);

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
  const { rememberCustomFormat } = getPreferenceValues<Preferences>();
  const [formatWarning, setFormatWarning] = useState<string | null>(null);

  const handleFormatChange = (value: string) => {
    if (value.trim() !== value) {
      setFormatWarning("Warning: Your password contains leading or trailing whitespace.");
    } else {
      setFormatWarning(null);
    }
  };

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
        id="customFormat"
        title="Custom password format"
        placeholder="e.g. {word} {word:uppercase} {symbol:2} {number:4}"
        storeValue={rememberCustomFormat}
        onChange={handleFormatChange}
        error={formatWarning ?? undefined}
      />
      <Form.Description
        text="Format options:

{word} (random uppercase or lowercase word)
{word:uppercase} (random uppercase word)
{word:lowercase} (random lowercase word)
{word:capitalize} (random word, first letter capitalized)
{symbol:n} (n number of random symbols)
{number:n} (n number of random digits)
{random:n} (n random characters, digits, symbols)"
      />
    </Form>
  );
}
