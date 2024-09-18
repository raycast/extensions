import { Clipboard, LaunchProps, showToast, Toast } from "@raycast/api";
import { createAppPassword } from "./utils/api";
import { Response } from "./utils/types";

export default async function CreateAppPassword(props: LaunchProps<{ arguments: Arguments.CreateAppPassword }>) {
  const { userHandle, name } = props.arguments;

  const response: Response = await createAppPassword({ userHandle, name });
  if (response.type === "success") {
    const { appPassword } = response.result;
    await showToast(Toast.Style.Success, "Copied to Clipboard", appPassword);
    await Clipboard.copy(appPassword || "");
  }
}
