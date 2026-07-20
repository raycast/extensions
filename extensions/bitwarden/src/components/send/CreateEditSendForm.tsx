import { Action, ActionPanel, Clipboard, Form, Toast, showToast } from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { Send, SendDateOption, SendType } from "~/types/send";
import { captureException } from "~/utils/development";
import { SendTypeOptions } from "~/constants/send";
import { PremiumFeatureError } from "~/utils/errors";
import { DebuggingBugReportingActionSection } from "~/components/actions";

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

export type SendFormValues = {
  name: string;
  text: string;
  hidden: boolean;
  file: string[] | undefined;
  deletionDate: string;
  customDeletionDate: Date | null;
  expirationDate: string;
  customExpirationDate: Date | null;
  maxAccessCount: string;
  accessPassword: string;
  notes: string;
  hideEmail: boolean;
  disabled: boolean;
};

export const sendFormInitialValues: SendFormValues = {
  name: "",
  text: "",
  hidden: false,
  file: undefined,
  deletionDate: SendDateOption.SevenDays,
  customDeletionDate: null,
  expirationDate: "",
  customExpirationDate: null,
  maxAccessCount: "",
  accessPassword: "",
  notes: "",
  hideEmail: false,
  disabled: false,
};

type CreateEditSendFormProps = {
  initialValues?: SendFormValues;
  onSuccess?: (send: Send, wasUrlCopiedToClipboard: boolean) => void;
} & (
  | {
      mode?: "create";
      onSave: (type: SendType, values: SendFormValues) => Promise<Send>;
    }
  | {
      mode?: "edit";
      onSave: (type: SendType, values: SendFormValues) => Promise<Send>;
    }
);

export const CreateEditSendForm = ({
  onSave,
  onSuccess,
  initialValues = sendFormInitialValues,
  mode = "create",
}: CreateEditSendFormProps) => {
  const [internalType, setInternalType] = useCachedState("sendType", SendType.Text);
  const [shouldCopyOnSave, setShouldCopyOnSave] = useCachedState("sendShouldCopyOnSave", false);

  const type = mode === "edit" ? (initialValues?.file ? SendType.File : SendType.Text) : internalType;

  const { itemProps, handleSubmit } = useForm({
    initialValues,
    onSubmit,
    validation: {
      name: FormValidation.Required,
      text: type === SendType.Text ? FormValidation.Required : undefined,
      file: type === SendType.File && mode === "create" ? FormValidation.Required : undefined,
      customDeletionDate: validateOptionalDateUnder31Days,
      customExpirationDate: validateOptionalDateUnder31Days,
      maxAccessCount: validateOptionalPositiveNumber,
    },
  });

  async function onSubmit(values: SendFormValues) {
    const toast = await showToast({
      title: mode === "edit" ? "Updating Send..." : "Creating Send...",
      style: Toast.Style.Animated,
    });
    try {
      const result = await onSave(type, values);

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

      toast.title = mode === "edit" ? "Send updated" : "Send created";
      toast.style = Toast.Style.Success;

      onSuccess?.(result, shouldCopyOnSave);
    } catch (error) {
      if (error instanceof PremiumFeatureError) {
        toast.message = "This feature is only available to Premium users.";
      }
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to ${mode === "edit" ? "update" : "create"} Send`;
      captureException(`Failed to ${mode === "edit" ? "update" : "create"} Send`, error);
    }
  }

  const onTypeChange = (value: string) => setInternalType(parseInt(value));

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "edit" ? "Save Send" : "Create Send"}
            icon={{ source: "send.svg" }}
            onSubmit={handleSubmit}
          />
          <DebuggingBugReportingActionSection />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.name}
        title="Name"
        placeholder="Enter a name"
        info="A friendly name to describe this send."
      />
      {mode === "create" && (
        <Form.Dropdown id="type" value={String(type)} onChange={onTypeChange} title="What type of Send is this?">
          {Object.entries(SendTypeOptions).map(([value, title]) => (
            <Form.Dropdown.Item key={value} value={value} title={title} />
          ))}
        </Form.Dropdown>
      )}
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
        <>
          {mode === "create" ? (
            <Form.FilePicker
              {...itemProps.file}
              title="File"
              info="The file you want to send."
              allowMultipleSelection={false}
            />
          ) : (
            <>
              <Form.Description text={itemProps.file.value?.[0] ?? "No file found."} title="File" />
              <Form.Description text="" />
            </>
          )}
        </>
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
        {...itemProps.accessPassword}
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
};
