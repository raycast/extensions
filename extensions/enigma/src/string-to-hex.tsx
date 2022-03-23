import { ActionPanel, Form, showToast, Clipboard, Action, Toast } from "@raycast/api";

function toHex(str: string) {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }

  return result;
}

function ShareSecretAction() {
  async function handleSubmit(values: { str: string }) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "converting string",
    });

    try {
      const hex: string = toHex(values.str);
      await Clipboard.copy(hex);

      toast.style = Toast.Style.Success;
      toast.title = "Success";
      toast.message = `Copied ${hex} to clipboard`;
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
      <Form.TextField id="str" title="string" placeholder="Enter string" />
    </Form>
  );
}
