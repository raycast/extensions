import { Action, ActionPanel, Clipboard, Form, Toast, showToast } from "@raycast/api";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { SendDateOption, SendPayload, SendType } from "~/types/send";
import { captureException } from "~/utils/development";
import { SendDateOptionsToHourOffsetMap, SendTypeOptions } from "~/constants/send";
import { PremiumFeatureError } from "~/utils/errors";

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
  file: string[] | undefined;
  deletionDate: string;
  customDeletionDate: Date | null;
  expirationDate: string;
  customExpirationDate: Date | null;
  maxAccessCount: string;
  password: string;
  notes: string;
  hideEmail: boolean;
  disabled: boolean;
};

const getStringFromDateOption = (option: SendDateOption | "", customDate: Date | null) => {
  if (!option) return null;
  if (option === SendDateOption.Custom) return customDate?.toISOString() ?? null;
  const hourOffset = SendDateOptionsToHourOffsetMap[option];
  if (!hourOffset) return null;
  const date = new Date();
  date.setHours(date.getHours() + hourOffset);
  return date.toISOString();
};

const convertFormValuesToSendPayload = (type: SendType, values: FormValues): SendPayload => ({
  type,
  name: values.name,
  text: values.text ? { text: values.text, hidden: values.hidden } : null,
  file: values.file?.[0] ? { fileName: values.file[0] } : null,
  deletionDate: getStringFromDateOption(values.deletionDate as SendDateOption, values.customDeletionDate),
  expirationDate: getStringFromDateOption(values.expirationDate as SendDateOption, values.customExpirationDate),
  maxAccessCount: values.maxAccessCount ? parseInt(values.maxAccessCount) : null,
  password: values.password || null,
  notes: values.notes || null,
  hideEmail: values.hideEmail,
  disabled: values.disabled,
});

const validateOptionalDateUnder31Days = (value: Date | null | undefined) => {
  if (!value) return;
  const date = new Date();
  date.setDate(date.getDate() + 31);
  if (value > date) return "Must be under 31 days from now.";
};

const validateOptionalPositiveNumber = (value: string | undefined) => {
  if (!value) return;
  const number = parseInt(value);
  if (isNaN(number) || number <= 0) return "Must be a positive number.";
};

const initialValues: FormValues = {
  name: "",
  text: "",
  hidden: false,
  file: undefined,
  deletionDate: SendDateOption.SevenDays,
  customDeletionDate: null,
  expirationDate: "",
  customExpirationDate: null,
  maxAccessCount: "",
  password: "",
  notes: "",
  hideEmail: false,
  disabled: false,
};

function SendCommandContent() {
  const bitwarden = useBitwarden();
  const [type, setType] = useCachedState("sendType", SendType.File);
  const [shouldCopyOnSave, setShouldCopyOnSave] = useCachedState("sendShouldCopyOnSave", false);

  const { itemProps, handleSubmit } = useForm({
    initialValues,
    onSubmit,
    validation: {
      name: FormValidation.Required,
      text: type === SendType.Text ? FormValidation.Required : undefined,
      file: type === SendType.File ? FormValidation.Required : undefined,
      customDeletionDate: validateOptionalDateUnder31Days,
      customExpirationDate: validateOptionalDateUnder31Days,
      maxAccessCount: validateOptionalPositiveNumber,
    },
  });

  async function onSubmit(values: FormValues) {
    const toast = await showToast({ title: "Creating Send...", style: Toast.Style.Animated });
    try {
      const newLocal = convertFormValuesToSendPayload(type, values);
      console.log(newLocal);

      const { error, result } = await bitwarden.createSend(newLocal);
      if (error) throw error;
      if (shouldCopyOnSave) {
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
      if (error instanceof PremiumFeatureError) {
        toast.message = "This feature is only available to Premium users.";
      }
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create Send";
      captureException("Failed to create Send", error);
    }
  }

  const onTypeChange = (value: string) => setType(parseInt(value));

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.name}
        title="Name"
        placeholder="Enter a name"
        info="A friendly name to describe this send."
      />
      <Form.Dropdown id="type" value={String(type)} onChange={onTypeChange} title="What type of Send is this?">
        {Object.entries(SendTypeOptions).map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      {type === SendType.Text && (
        <>
          <Form.TextArea
            {...itemProps.text}
            title="Text"
            placeholder="Enter the text you want to send"
            info="The text you want to send"
          />
          <Form.Checkbox {...itemProps.hidden} label="Hide this Send's text by default" />
        </>
      )}
      {type === SendType.File && (
        <Form.FilePicker
          {...itemProps.file}
          title="File"
          info="The file you want to send."
          allowMultipleSelection={false}
        />
      )}
      <Form.Checkbox
        title="Share"
        id="copySendOnSave"
        label="Copy this Send's to clipboard upon save"
        value={shouldCopyOnSave}
        onChange={setShouldCopyOnSave}
      />
      <Form.Description text="" />
      <Form.Separator />
      <Form.Description text="Options" />
      <Form.Dropdown
        {...itemProps.deletionDate}
        title="Deletion date"
        info="The Send will be permanently deleted on the specified date and time."
      >
        {Object.values(SendDateOption).map((value) => (
          <Form.Dropdown.Item key={value} value={value} title={value} />
        ))}
      </Form.Dropdown>
      {itemProps.deletionDate.value === SendDateOption.Custom && (
        <Form.DatePicker {...itemProps.customDeletionDate} title="Custom deletion date" />
      )}
      <Form.Dropdown
        {...itemProps.expirationDate}
        title="Expiration date"
        info="If set, access to this Send will expire on the specified date and time."
      >
        <Form.Dropdown.Item value="" title="Never" />
        {Object.values(SendDateOption).map((value) => (
          <Form.Dropdown.Item key={value} value={value} title={value} />
        ))}
      </Form.Dropdown>
      {itemProps.expirationDate.value === SendDateOption.Custom && (
        <Form.DatePicker {...itemProps.customExpirationDate} title="Custom expiration date" />
      )}
      <Form.TextField
        {...itemProps.maxAccessCount}
        title="Maximum Access Count"
        placeholder="Enter a maximum number of accesses"
        info="If set, user will no longer be able to access this Send once the maximum access count is reached."
      />
      <Form.PasswordField
        {...itemProps.password}
        title="Password"
        placeholder="Enter a password"
        info="Optionally require a password for users to access this Send."
      />
      <Form.TextArea
        {...itemProps.notes}
        title="Notes"
        placeholder="Enter notes"
        info="Private notes about this Send."
      />
      <Form.Checkbox {...itemProps.hideEmail} label="Hide my email address from recipients" />
      <Form.Checkbox {...itemProps.disabled} label="Deactivate this Send so no one can access it" />
    </Form>
  );
}

export default SendCommand;
