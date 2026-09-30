import { Detail, showToast, Toast } from "@raycast/api";
import { DEFAULT_ERROR_TITLE } from "../../constants";
import { getUnknownErrorText } from "../../utils/messageUtils";

export function UnknownError() {
  showToast(Toast.Style.Failure, DEFAULT_ERROR_TITLE, "Something went wrong.");

  return <Detail markdown={getUnknownErrorText()} />;
}
