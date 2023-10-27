import { Clipboard, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { getAccountCredit } from "./utils/api";
import { Response } from "./utils/types";
import { showFailureToast } from "@raycast/utils";

export default async function CheckAccountCredit() {
  const response: Response = await getAccountCredit();

  if (response.type === "error") {
    await showFailureToast(response.message, { title: response.code });
  } else {
    const { credit } = response.result;
    const roundedCredit = parseFloat(credit as string).toFixed(2);
    await Clipboard.copy(roundedCredit);
    await showToast(Toast.Style.Success, "Copied to Clipboard", roundedCredit);
    await updateCommandMetadata({ subtitle: `Purelymail | Account Credit: ${roundedCredit}` });
  }
}
