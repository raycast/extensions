import { ProcessedRecord, RecordField } from "../lib/types";
import { Action, Clipboard, Icon, showToast, Toast } from "@raycast/api";
import { isCanceledError, RECORD_TYPES, titleCaseWord } from "../lib/helpers";
import { ERROR_MESSAGES, IN_PROGRESS_MESSAGES, RECORD_RESPONSE_FIELDS, SUCCESS_MESSAGES } from "../lib/constants";
import { getRecordById, getTwoFactorCode, oneTimeShareRecord, syncRecords } from "../api";
import { handleError } from "../lib/error-handler";
import CommonActions from "./CommonActions";

interface MyVaultActionPanelProps {
  record: ProcessedRecord;
  fetchAllRecords: () => void;
  setError: (error: unknown) => void;
  customerServerUrl: string | null;
}

const MyVaultActionPanel = ({ record, fetchAllRecords, setError, customerServerUrl }: MyVaultActionPanelProps) => {
  const fetchAndCopyRecordDetails = async (
    recordUid: string,
    fieldToCopy: typeof RECORD_RESPONSE_FIELDS.LOGIN | typeof RECORD_RESPONSE_FIELDS.PASSWORD,
  ) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: IN_PROGRESS_MESSAGES.FETCHING_RECORD_DETAILS_TITLE,
    });
    try {
      const recordDetailsResponse = await getRecordById(recordUid);
      const recordDetails = recordDetailsResponse.data?.data;
      const { fields } = recordDetails ?? [];

      const fieldValue = fields && fields.find((field: RecordField) => field.type === fieldToCopy);

      const value = fieldValue?.value[0] ?? "";

      if (!value) {
        toast.style = Toast.Style.Failure;
        toast.title = ERROR_MESSAGES.NO_VALUE_TO_COPY;
        return;
      }

      await Clipboard.copy(value, { concealed: true });
      toast.style = Toast.Style.Success;
      toast.title = `${titleCaseWord(fieldToCopy)} ${SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD}`;
    } catch (error) {
      if (isCanceledError(error as Error)) {
        return;
      }

      toast.hide();

      setError(error);
    }
  };

  const handleSyncRecords = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: IN_PROGRESS_MESSAGES.SYNCING_RECORDS_TITLE,
    });
    try {
      await syncRecords();

      toast.style = Toast.Style.Success;
      toast.title = SUCCESS_MESSAGES.SYNC_RECORDS_SUCCESS;

      fetchAllRecords();
    } catch (error) {
      if (isCanceledError(error as Error)) {
        return;
      }

      toast.hide();

      setError(error);
    }
  };

  const handleOneTimeShareRecord = async (recordUid: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: IN_PROGRESS_MESSAGES.ONE_TIME_SHARE_RECORD_TITLE,
    });
    try {
      const response = await oneTimeShareRecord(recordUid);

      const { message } = response.data;

      const sharedRecordUrl = message;

      if (!sharedRecordUrl) {
        toast.style = Toast.Style.Failure;
        toast.title = ERROR_MESSAGES.ONE_TIME_SHARE_RECORD;
        return;
      }

      await Clipboard.copy(sharedRecordUrl);

      toast.style = Toast.Style.Success;
      toast.title = SUCCESS_MESSAGES.ONE_TIME_SHARE_RECORD_SUCCESS;
    } catch (error) {
      if (isCanceledError(error as Error)) {
        return;
      }

      toast.hide();

      setError(error);
    }
  };

  const handleCopyTwoFactorCode = async (recordUid: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: IN_PROGRESS_MESSAGES.FETCHING_TWO_FACTOR_CODE_TITLE,
    });

    try {
      const response = await getTwoFactorCode(recordUid);
      const { message } = response.data;

      const twoFactorCodeData = message;

      const currentTwoFactorCode = twoFactorCodeData?.split("\n")[1]?.split("Current")[1]?.trim();

      if (!currentTwoFactorCode) {
        toast.style = Toast.Style.Failure;
        toast.title = ERROR_MESSAGES.COPY_TWO_FACTOR_CODE;
        toast.message = ERROR_MESSAGES.COPY_TWO_FACTOR_CODE;
        return;
      }

      await Clipboard.copy(currentTwoFactorCode, { concealed: true });
      toast.style = Toast.Style.Success;
      toast.title = SUCCESS_MESSAGES.TWO_FACTOR_CODE_COPIED;
    } catch (error) {
      if (isCanceledError(error as Error)) {
        return;
      }

      const filteredError = handleError(error);
      const { message } = filteredError;

      const totpNotFound = message.includes("does not contain TOTP codes");

      toast.style = Toast.Style.Failure;
      toast.title = ERROR_MESSAGES.COPY_TWO_FACTOR_CODE;
      toast.message = totpNotFound ? ERROR_MESSAGES.TOTP_NOT_FOUND : message;

      if (!totpNotFound) {
        setError(error);
      }
    }
  };

  return (
    <>
      {customerServerUrl && (
        <Action.OpenInBrowser
          key="open-in-browser"
          title="Open in Browser"
          url={`https://${customerServerUrl}/vault/#detail/${record.recordUid}`}
          shortcut={{ modifiers: ["opt"], key: "return" }}
        />
      )}
      {record.type === RECORD_TYPES.LOGIN && (
        <>
          <Action
            title="Copy Login"
            icon={Icon.Clipboard}
            onAction={() => fetchAndCopyRecordDetails(record.recordUid, "login")}
          />
          <Action
            title="Copy Password"
            icon={Icon.Clipboard}
            onAction={() => fetchAndCopyRecordDetails(record.recordUid, "password")}
          />
        </>
      )}
      <Action
        title="One-Time Share Record"
        icon={Icon.Link}
        onAction={() => handleOneTimeShareRecord(record.recordUid)}
      />
      <Action
        title="Copy Two Factor Code"
        icon={Icon.Clipboard}
        onAction={() => handleCopyTwoFactorCode(record.recordUid)}
      />
      <Action title="Sync Records" icon={Icon.RotateClockwise} onAction={handleSyncRecords} />
      <CommonActions />
    </>
  );
};

export default MyVaultActionPanel;
