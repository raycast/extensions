import { ActionPanel, Form, showToast, Clipboard, Action, Toast } from "@raycast/api";

const REGEX = /^(?:0[xX]?)?[0-9a-fA-F]+$/;

function isHex(h: string) {
  return REGEX.test(h);
}

function ShareSecretAction() {
  async function handleSubmit(values: { hex: string | number }) {
    if (!values.hex || !isHex(String(values.hex))) {
      showToast({
        style: Toast.Style.Failure,
        title: "invalid hex",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "converting hex",
    });

    try {
      const decimal: string = parseInt(String(values.hex), 16).toString();
      await Clipboard.copy(decimal);

      toast.style = Toast.Style.Success;
      toast.title = "Success";
      toast.message = `Copied ${decimal} to clipboard`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failure";
      console.log(error);
      toast.message = String(error);
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
