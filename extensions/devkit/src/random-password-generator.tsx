import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";

export default function Command() {
  async function handleSubmit(values: {
    length: string;
    upper: boolean;
    lower: boolean;
    numbers: boolean;
    symbols: boolean;
  }) {
    const length = parseInt(values.length) || 12;
    const { upper, lower, numbers, symbols } = values;

    if (!upper && !lower && !numbers && !symbols) {
      await showToast(Toast.Style.Failure, "Select at least one character type");
      return;
    }

    const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowerChars = "abcdefghijklmnopqrstuvwxyz";
    const numberChars = "0123456789";
    const symbolChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    let chars = "";
    if (upper) chars += upperChars;
    if (lower) chars += lowerChars;
    if (numbers) chars += numberChars;
    if (symbols) chars += symbolChars;

    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    await Clipboard.copy(password);
    await showToast(Toast.Style.Success, "Generated password copied to clipboard");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Password" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="length" title="Password Length" placeholder="12" defaultValue="12" />
      <Form.Checkbox id="upper" label="Include Uppercase" defaultValue={true} />
      <Form.Checkbox id="lower" label="Include Lowercase" defaultValue={true} />
      <Form.Checkbox id="numbers" label="Include Numbers" defaultValue={true} />
      <Form.Checkbox id="symbols" label="Include Symbols" defaultValue={false} />
    </Form>
  );
}
