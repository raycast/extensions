import { ActionPanel, Form, showToast, Clipboard, Action, Toast } from "@raycast/api";
import { BigNumber } from "ethers";

const REGEX = /^(?:0[xX]?)?[0-9a-fA-F]+$/;

function isHex(h: string) {
  return REGEX.test(h);
}

function ShareSecretAction() {
  async function handleSubmit(values: { hex: string }) {
    let hexInput = values.hex.toLowerCase();
    if (hexInput.slice(0, 2) !== "0x") {
      hexInput = "0x" + hexInput;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "converting hex",
    });

    try {
      const bn = BigNumber.from(hexInput);
      const decimal = bn.toString();
      await Clipboard.copy(decimal);

      toast.style = Toast.Style.Success;
      toast.title = "Success";
      toast.message = `Copied ${decimal} to clipboard`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failure";
      toast.message = `${values.hex} invalid hex`;
    }
  }

  return <Action.SubmitForm title="convert" onSubmit={handleSubmit} />;
}

export default function main() {
  return (
    <Form
      actions={
        <ActionPanel>
          <ShareSecretAction />
        </ActionPanel>
      }
    >
      <Form.TextField id="hex" title="hex" placeholder="Enter hex number" />
    </Form>
  );
}
