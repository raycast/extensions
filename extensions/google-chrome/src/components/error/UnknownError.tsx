import { Detail, showToast, Toast } from "@raycast/api";
import { DEFAULT_ERROR_TITLE, UnknownErrorText } from "../../constants";

export function UnknownError({ message }: { message?: string } = {}) {
  showToast(Toast.Style.Failure, DEFAULT_ERROR_TITLE, message ?? "Something happened while trying to run your command");

  const markdown = message ? `${UnknownErrorText}\n\n\`\`\`\n${message}\n\`\`\`` : UnknownErrorText;

  return <Detail markdown={markdown} />;
}
