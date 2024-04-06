import { Form, useNavigation } from "@raycast/api";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { SendDateOption, SendCreatePayload, SendType, Send } from "~/types/send";
import { SendDateOptionsToHourOffsetMap } from "~/constants/send";
import { CreateEditSendForm, SendFormValues, sendFormInitialValues } from "~/components/send/CreateEditSendForm";
import SearchSendsCommand from "~/search-sends";

const LoadingFallback = () => <Form isLoading />;

type CreateEditSendCommandProps = {
  send?: Send;
  onSuccess?: (send: Send) => void;
};

const CreateSendCommand = (props: CreateEditSendCommandProps) => (
  <RootErrorBoundary>
    <BitwardenProvider loadingFallback={<LoadingFallback />}>
      <SessionProvider loadingFallback={<LoadingFallback />} unlock>
        <CreateSendCommandContent {...props} />
      </SessionProvider>
    </BitwardenProvider>
  </RootErrorBoundary>
);

function getStringFromDateOption(option: SendDateOption, customDate: Date | null): string;
function getStringFromDateOption(option: SendDateOption | "", customDate: Date | null): string | null;
function getStringFromDateOption(option: SendDateOption | "", customDate: Date | null) {
  if (!option) return null;
  if (option === SendDateOption.Custom) return customDate?.toISOString() ?? null;

  const hourOffset = SendDateOptionsToHourOffsetMap[option];
  if (!hourOffset) return null;

  const date = new Date();
  date.setHours(date.getHours() + hourOffset);
  return date.toISOString();
}

const convertFormValuesToCreatePayload = (type: SendType, values: SendFormValues): SendCreatePayload => ({
  type,
  name: values.name,
  text: values.text ? { text: values.text, hidden: values.hidden } : null,
  file: values.file?.[0] ? { fileName: values.file[0] } : null,
  deletionDate: getStringFromDateOption(values.deletionDate as SendDateOption, values.customDeletionDate),
  expirationDate: getStringFromDateOption(values.expirationDate as SendDateOption | "", values.customExpirationDate),
  maxAccessCount: values.maxAccessCount ? parseInt(values.maxAccessCount) : null,
  password: values.accessPassword || null,
  notes: values.notes || null,
  hideEmail: values.hideEmail,
  disabled: values.disabled,
});

const convertFormValuesToEditPayload = (send: Send, type: SendType, values: SendFormValues): Send => ({
  ...send,
  ...convertFormValuesToCreatePayload(type, values),
});

const parseDateOptionString = (
  dateString: string | null
): { option: SendDateOption | undefined; customDate: Date | null } => {
  if (!dateString) return { option: undefined, customDate: null };
  // TODO: Figure out a reliable way of mapping dates to SendDateOption
  return { option: SendDateOption.Custom, customDate: new Date(dateString) };
};

const getInitialValues = (send?: Send): SendFormValues => {
  if (!send) return sendFormInitialValues;

  const deletionDate = parseDateOptionString(send.deletionDate);
  const expirationDate = parseDateOptionString(send.expirationDate);
  return {
    ...sendFormInitialValues,
    name: send.name,
    text: send.text?.text || sendFormInitialValues.text,
    hidden: send.text?.hidden || sendFormInitialValues.hidden,
    file: send.file ? [send.file.fileName] : sendFormInitialValues.file,
    deletionDate: deletionDate.option || sendFormInitialValues.deletionDate,
    customDeletionDate: deletionDate.customDate || sendFormInitialValues.customDeletionDate,
    expirationDate: expirationDate.option || sendFormInitialValues.expirationDate,
    customExpirationDate: expirationDate.customDate || sendFormInitialValues.customExpirationDate,
    maxAccessCount: send.maxAccessCount ? String(send.maxAccessCount) : sendFormInitialValues.maxAccessCount,
    notes: send.notes || sendFormInitialValues.notes,
    hideEmail: send.hideEmail || sendFormInitialValues.hideEmail,
    disabled: send.disabled || sendFormInitialValues.disabled,
  };
};

function CreateSendCommandContent({ send, onSuccess: parentOnSuccess }: CreateEditSendCommandProps) {
  const { push } = useNavigation();
  const bitwarden = useBitwarden();

  async function onSave(type: SendType, values: SendFormValues) {
    if (!send) {
      const payload = convertFormValuesToCreatePayload(type, values);
      const { error, result } = await bitwarden.createSend(payload);
      if (error) throw error;
      return result;
    } else {
      const payload = convertFormValuesToEditPayload(send, type, values);
      const { error, result } = await bitwarden.editSend(payload);
      if (error) throw error;
      return result;
    }
  }

  const onSuccess = (send: Send) => {
    if (parentOnSuccess) {
      parentOnSuccess(send);
    } else {
      push(<SearchSendsCommand />);
    }
  };

  return (
    <CreateEditSendForm
      mode={send ? "edit" : "create"}
      initialValues={getInitialValues(send)}
      onSave={onSave}
      onSuccess={onSuccess}
    />
  );
}

export default CreateSendCommand;
