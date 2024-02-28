import { showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { getAccountCredit } from "./utils/api";
import { Response } from "./utils/types";
import { showFailureToast } from "@raycast/utils";

export default async function CheckAccountCredit() {
  const response: Response = await getAccountCredit();

  if (response.type === "error") {
    await showFailureToast(response.message, { title: response.code });
  } else {
    const { credit } = response.result;
    const formattedCredit = Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(credit));
    await showToast(Toast.Style.Success, "SUCCESS", `Account Credit: ${formattedCredit}`);
    await updateCommandMetadata({ subtitle: `Purelymail | Account Credit: ${formattedCredit}` });
  }
}
