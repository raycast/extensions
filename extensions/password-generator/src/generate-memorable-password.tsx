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
      setFormatWarning("Warning: Your password will contain leading or trailing whitespace.");
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
        info="Use {word} for a random uppercase or lowercase word, {word:uppercase} or {word:lowercase} for uppercase or lowercase word, {word:capitalize} for a word with the first letter capitalized, {symbol:n} for n symbols, {number:n} for n numbers, {random:n} for n random characters"
        storeValue={rememberCustomFormat}
        onChange={handleFormatChange}
      />
      {formatWarning && <Form.Description text={formatWarning} />}
    </Form>
  );
}
