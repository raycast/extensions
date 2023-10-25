import { showToast, Toast } from "@raycast/api";
import { getAccountCredit } from "./utils/api";
import { Response } from "./utils/types";
import { showFailureToast } from "@raycast/utils";

export default async function CheckAccountCredit() {
  const response: Response = await getAccountCredit();

  if (response.type === "error") {
    await showFailureToast(response.message, { title: response.code });
  } else {
    await showToast(Toast.Style.Success, "SUCCESS", `Credit: ${response.result.credit}`);
  }
}
