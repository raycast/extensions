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
import { FormValidation, useForm } from "@raycast/utils";
import { p2pkhScriptFromAddress } from "./lib/bitcoin";

interface FormValues {
  address: string;
  format: string;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      format: "asm",
    },
    validation: {
      address: FormValidation.Required,
    },
    async onSubmit(values) {
      try {
        const scripts = p2pkhScriptFromAddress(values.address);
        const format = values.format === "hex" ? "hex" : "asm";
        const script = scripts[format];
        await Clipboard.copy(script);
        await closeMainWindow();
        await showHUD(`Copied P2PKH script as ${format.toUpperCase()}`);
      } catch (error) {
        console.error("Unable to create P2PKH script", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Address",
          message: "Enter a valid BSV mainnet or testnet address.",
        });
      }
    },
  });

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
        title="Address"
        placeholder="Enter a BSV address"
        autoFocus
        {...itemProps.address}
      />
      <Form.Dropdown title="Output Format" {...itemProps.format}>
        <Form.Dropdown.Item value="asm" title="ASM" />
        <Form.Dropdown.Item value="hex" title="Hex" />
      </Form.Dropdown>
    </Form>
  );
}
