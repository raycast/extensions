import { Detail, showToast, Toast } from "@raycast/api";
import { DEFAULT_ERROR_TITLE, UnknownErrorText } from "../../constants";

export function UnknownError({ message }: { message: string }) {
  showFailureToast(message, { title: DEFAULT_ERROR_TITLE });

  return <Detail markdown={UnknownErrorText} />;
}
