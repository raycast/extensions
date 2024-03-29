import { Action, ActionPanel, Clipboard, Form, Toast, showToast } from "@raycast/api";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { SendPayload, SendType } from "~/types/send";
import { captureException } from "~/utils/development";

const LoadingFallback = () => <Form isLoading />;

const SendCommand = () => (
  <RootErrorBoundary>
    <BitwardenProvider loadingFallback={<LoadingFallback />}>
      <SessionProvider unlock>
        <SendCommandContent />
      </SessionProvider>
    </BitwardenProvider>
  </RootErrorBoundary>
);

// {"object":"send","name":"Send name","notes":"Some notes about this send.","type":0,"text":{"text":"Text contained in the send.","hidden":false},"file":null,"maxAccessCount":null,"deletionDate":"2024-04-04T20:21:03.080Z","expirationDate":null,"password":null,"disabled":false,"hideEmail":false}

type FormValues = {
  name: string;
  text: string;
  hidden: boolean;
};

const initialValues: FormValues = {
  name: "",
  text: "",
  hidden: false,
};

const convertFormValuesToSendPayload = (values: FormValues): SendPayload => ({
  name: values.name,
  type: SendType.Text,
  text: {
    text: values.text,
  },
});

function SendCommandContent() {
  const bitwarden = useBitwarden();
  const [copyOnSave, setCopyOnSave] = useCachedState("copySendOnSave", false);
  const { itemProps, handleSubmit } = useForm({
    initialValues,
    onSubmit,
    validation: {
      name: FormValidation.Required,
      text: FormValidation.Required,
    },
  });

  async function onSubmit(values: FormValues) {
    const toast = await showToast({ title: "Creating Send...", style: Toast.Style.Animated });
    try {
      const { error, result } = await bitwarden.createSend(convertFormValuesToSendPayload(values));
      if (error) throw error;
      if (copyOnSave) {
        await Clipboard.copy(result.accessUrl);
        toast.message = "URL copied to clipboard";
      } else {
        toast.primaryAction = {
          title: "Copy URL",
          onAction: async () => {
            await Clipboard.copy(result.accessUrl);
            toast.message = "URL copied to clipboard";
          },
        };
      }
      toast.style = Toast.Style.Success;
      toast.title = "Send created";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create Send";
      captureException("Failed to create Send", error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="Enter a name"
        info="A friendly name to describe this send"
        {...itemProps.name}
      />
      <Form.TextArea title="Text" placeholder="Enter some text" info="The text you want to send" {...itemProps.text} />
      <Form.Checkbox label="Hide this Send's text by default" {...itemProps.hidden} />
      <Form.Separator />
      <Form.Checkbox
        title="Share"
        id="copySendOnSave"
        label="Copy this Send's to clipboard upon save"
        value={copyOnSave}
        onChange={setCopyOnSave}
      />
    </Form>
  );
}

export default SendCommand;
