import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  Icon,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { p2pkhScriptFromAddress } from "./lib/bitcoin";

interface FormValues {
  address: string;
  format: "asm" | "hex";
}

export default function Command() {
  async function handleSubmit(values: FormValues) {
    try {
      const scripts = p2pkhScriptFromAddress(values.address);
      const script = scripts[values.format];
      await Clipboard.copy(script);
      await closeMainWindow();
      await showHUD(`Copied P2PKH script as ${values.format.toUpperCase()}`);
    } catch (error) {
      console.error("Unable to create P2PKH script", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Address",
        message: "Enter a valid BSV mainnet or testnet address.",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Copy P2PKH Script"
            icon={Icon.Clipboard}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="address"
        title="Address"
        placeholder="Enter a BSV address"
      />
      <Form.Dropdown id="format" title="Output Format" defaultValue="asm">
        <Form.Dropdown.Item value="asm" title="ASM" />
        <Form.Dropdown.Item value="hex" title="Hex" />
      </Form.Dropdown>
    </Form>
  );
}
