import { environment, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { getAccountCredit } from "./utils/api";
import { Response } from "./utils/types";
import { showFailureToast } from "@raycast/utils";

export default async function CheckAccountCredit() {
  if (environment.launchType === "userInitiated") {
    const response: Response = await getAccountCredit({ hideToasts: false });

    if (response.type === "error") {
      await showFailureToast(response.message, { title: response.code });
    } else {
      const { credit } = response.result;
      const formattedCredit = Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(credit));
      await showToast(Toast.Style.Success, "SUCCESS", `Account Credit: ${formattedCredit}`);
      await updateCommandMetadata({ subtitle: `Purelymail | Account Credit: ${formattedCredit}` });
    }
  } else {
    const response: Response = await getAccountCredit({ hideToasts: true });

    if (response.type === "success") {
      const { credit } = response.result;
      const formattedCredit = Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(credit));
      await updateCommandMetadata({ subtitle: `Purelymail | Account Credit: ${formattedCredit}` });
    }
  }
}
