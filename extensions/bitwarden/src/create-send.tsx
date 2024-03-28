import { Action, ActionPanel, Form } from "@raycast/api";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { FormValidation, useForm } from "@raycast/utils";

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

function SendCommandContent() {
  const bitwarden = useBitwarden();
  const { itemProps, handleSubmit } = useForm({
    initialValues,
    onSubmit,
    validation: {
      name: FormValidation.Required,
      text: FormValidation.Required,
    },
  });

  function onSubmit(values: FormValues) {}

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Enter name" {...itemProps.name} />
      <Form.TextArea title="Text" placeholder="The text you want to send" {...itemProps.text} />
      <Form.Checkbox label="Hide this Send's text by default" {...itemProps.hidden} />
    </Form>
  );
}

export default SendCommand;
