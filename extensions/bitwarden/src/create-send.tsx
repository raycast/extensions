import { Action, ActionPanel, Clipboard, Form, Toast, showToast } from "@raycast/api";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { SendDeletionDateOption, SendPayload, SendType } from "~/types/send";
import { captureException } from "~/utils/development";
import { SendDeletionDateOptionsToHourOffsetMap } from "~/constants/send";

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

type FormValues = {
  name: string;
  text: string;
  hidden: boolean;
  deletionDate: string;
  customDeletionDate: Date | null;
};

const initialValues: FormValues = {
  name: "",
  text: "",
  hidden: false,
  deletionDate: SendDeletionDateOption.SevenDays,
  customDeletionDate: null,
};

const getDeletionDate = (deletionDate: SendDeletionDateOption, customDeletionDate: Date | null): string | null => {
  if (deletionDate === SendDeletionDateOption.Custom) return customDeletionDate?.toISOString() ?? null;
  const hourOffset = SendDeletionDateOptionsToHourOffsetMap[deletionDate];
  if (!hourOffset) return null;
  const date = new Date();
  date.setHours(date.getHours() + hourOffset);
  return date.toISOString();
};

const convertFormValuesToSendPayload = (values: FormValues): SendPayload => {
  const { name, text, deletionDate, customDeletionDate } = values;

  return {
    name,
    type: SendType.Text,
    text: { text },
    deletionDate: getDeletionDate(deletionDate as SendDeletionDateOption, customDeletionDate),
  };
};

function SendCommandContent() {
  const bitwarden = useBitwarden();
  const [copyOnSave, setCopyOnSave] = useCachedState("copySendOnSave", false);
  const { itemProps, handleSubmit } = useForm({
    initialValues,
    onSubmit,
    validation: {
      name: FormValidation.Required,
      text: FormValidation.Required,
      customDeletionDate: (value) => {
        if (!value) return;
        const date = new Date();
        date.setDate(date.getDate() + 31);
        if (value > date) return "Must be under 31 days from now.";
      },
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
      <Form.Checkbox
        title="Share"
        id="copySendOnSave"
        label="Copy this Send's to clipboard upon save"
        value={copyOnSave}
        onChange={setCopyOnSave}
      />
      <Form.Dropdown title="Deletion date" {...itemProps.deletionDate}>
        {Object.values(SendDeletionDateOption).map((value) => (
          <Form.Dropdown.Item key={value} value={value} title={value} />
        ))}
      </Form.Dropdown>
      {itemProps.deletionDate.value === SendDeletionDateOption.Custom && (
        <Form.DatePicker title="Custom" {...itemProps.customDeletionDate} />
      )}
    </Form>
  );
}

export default SendCommand;
