import { ActionPanel, copyTextToClipboard, Detail, Form, showHUD, showToast, SubmitFormAction, ToastStyle } from "@raycast/api";
import execa from "execa";
import { TroubleshootingGuide, UnlockForm } from "./components";
import { useSessionToken } from "./hooks";
import { Send } from "./types";
import { checkCliPath, getWorkflowEnv } from "./utils";

export default function SendCommand(): JSX.Element {
  if (!checkCliPath()) {
    return <TroubleshootingGuide />;
  }
  const [sessionToken, setSessionToken] = useSessionToken();

  if (sessionToken === undefined) return <Detail isLoading={true} />;
  else if (sessionToken === null) return <UnlockForm setSessionToken={setSessionToken} />;

  return <SendForm sessionToken={sessionToken} />;
}

function SendForm(props: { sessionToken: string }) {
  const date = new Date();
  date.setDate(date.getDate() + 7);

  async function handleSubmit(values: { name: string; text: string; notes: string; deletionDate: Date }) {
    const send: Send = {
      object: "send",
      name: values.name,
      notes: values.notes,
      deletionDate: values.deletionDate.toISOString(),
      expirationDate: null,
      disabled: false,
      file: null,
      hideEmail: false,
      maxAccessCount: null,
      password: null,
      text: {
        hidden: false,
        text: values.text,
      },
      type: 0,
    };
    const toast = await showToast(ToastStyle.Animated, "Creating Send...")
    const { stdout: output } = await execa.command("bw encode | bw send create --raw", {
      input: JSON.stringify(send),
      shell: true,
      env: { ...getWorkflowEnv(), BW_SESSION: props.sessionToken },
    });
    toast.hide()
    copyTextToClipboard(output.split("\n")[1]);
    showHUD("Link Copied to Clipboard!");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Send" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" placeholder="The name of the Send." title="Name" />
      <Form.TextArea id="text" placeholder="The text you want to send." title="Text" />
      <Form.TextArea id="notes" placeholder="Private notes about this Send." title="Note" />
      <Form.DatePicker id="deletionDate" defaultValue={date} title="Deletion Date" />
    </Form>
  );
}
