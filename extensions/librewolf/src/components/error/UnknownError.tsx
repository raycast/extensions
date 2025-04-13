import { Detail } from "@raycast/api";
import { DEFAULT_ERROR_TITLE, UnknownErrorText } from "../../constants";
import { showFailureToast } from "@raycast/utils";

export function UnknownError({ message }: { message: string }) {
  showFailureToast(message, { title: DEFAULT_ERROR_TITLE });

  return <Detail markdown={UnknownErrorText} />;
}
