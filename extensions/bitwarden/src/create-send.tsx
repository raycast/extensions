import { Action, ActionPanel, Clipboard, Form, Toast, showToast } from "@raycast/api";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { SendDateOption, SendPayload, SendType } from "~/types/send";
import { captureException } from "~/utils/development";
import { SendDateOptionsToHourOffsetMap } from "~/constants/send";
import { useState } from "react";

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
  expirationDate: string;
  customExpirationDate: Date | null;
  maxAccessCount: string;
  password: string;
  notes: string;
  hideEmail: boolean;
  disabled: boolean;
};

const initialValues: FormValues = {
  name: "",
  text: "",
  hidden: false,
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

const getDateOption = (option: SendDateOption | "", customDate: Date | null): string | null => {
  if (!option) return null;
  if (option === SendDateOption.Custom) return customDate?.toISOString() ?? null;
  const hourOffset = SendDateOptionsToHourOffsetMap[option];
  if (!hourOffset) return null;
  const date = new Date();
  date.setHours(date.getHours() + hourOffset);
  return date.toISOString();
};

const convertFormValuesToSendPayload = (values: FormValues): SendPayload => ({
  name: values.name,
  type: SendType.Text,
  text: { text: values.text, hidden: values.hidden },
  deletionDate: getDateOption(values.deletionDate as SendDateOption, values.customDeletionDate),
  expirationDate: getDateOption(values.expirationDate as SendDateOption, values.customExpirationDate),
  maxAccessCount: values.maxAccessCount ? parseInt(values.maxAccessCount) : null,
  password: values.password || null,
  notes: values.notes || null,
  hideEmail: values.hideEmail,
  disabled: values.disabled,
});

const validateOptionalDateUnder31Days = (value: Date | null | undefined): string | undefined => {
  if (!value) return;
  const date = new Date();
  date.setDate(date.getDate() + 31);
  if (value > date) return "Must be under 31 days from now.";
};

const validateOptionalPositiveNumber = (value: string | undefined): string | undefined => {
  if (!value) return;
  const number = parseInt(value);
  if (isNaN(number) || number <= 0) return "Must be a positive number.";
};

function SendCommandContent() {
  const bitwarden = useBitwarden();
  const [shouldCopyOnSave, setShouldCopyOnSave] = useCachedState("shouldCopySendOnSave", false);
  const [shouldShowMoreOptions, setShouldShowMoreOptions] = useState(false);
  const { itemProps, handleSubmit } = useForm({
    initialValues,
    onSubmit,
    validation: {
      name: FormValidation.Required,
      text: FormValidation.Required,
      customDeletionDate: validateOptionalDateUnder31Days,
      customExpirationDate: validateOptionalDateUnder31Days,
      maxAccessCount: validateOptionalPositiveNumber,
    },
  });

  async function onSubmit(values: FormValues) {
    const toast = await showToast({ title: "Creating Send...", style: Toast.Style.Animated });
    try {
      const { error, result } = await bitwarden.createSend(convertFormValuesToSendPayload(values));
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
        {...itemProps.name}
        title="Name"
        placeholder="Enter a name"
        info="A friendly name to describe this send"
      />
      <Form.TextArea {...itemProps.text} title="Text" placeholder="Enter some text" info="The text you want to send" />
      <Form.Checkbox {...itemProps.hidden} label="Hide this Send's text by default" />
      <Form.Checkbox
        title="Share"
        id="copySendOnSave"
        label="Copy this Send's to clipboard upon save"
        value={shouldCopyOnSave}
        onChange={setShouldCopyOnSave}
      />
      <Form.Description text="" />
      <Form.Checkbox
        title={`${shouldShowMoreOptions ? "↓" : "→"}    Show more options`}
        id="showMoreOptions"
        label=""
        value={shouldShowMoreOptions}
        onChange={setShouldShowMoreOptions}
      />
      {shouldShowMoreOptions && (
        <>
          <Form.Separator />
          <Form.Description text="" />
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
            placeholder="Enter a number"
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
            placeholder="Enter some notes"
            info="Private notes about this Send."
          />
          <Form.Checkbox {...itemProps.hideEmail} label="Hide my email address from recipients." />
          <Form.Checkbox {...itemProps.disabled} label="Deactivate this Send so no one can access it." />
        </>
      )}
    </Form>
  );
}

export default SendCommand;
