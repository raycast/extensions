import { LaunchType, Toast, environment, showToast, updateCommandMetadata } from "@raycast/api";
import { type AccountBalance, ErrorResponse, SuccessResponse } from "./lib/types";
import { showFailureToast } from "@raycast/utils";
import generateApiUrl from "./lib/utils/generateApiUrl";

export default async function AccountBalance() {
  try {
    if (environment.launchType === LaunchType.UserInitiated) {
      await showToast(Toast.Style.Animated, "Fetching Account Balance");
    }
    const url = generateApiUrl("getAccountBalance");
    const response = await fetch(url);
    const result = (await response.json()) as SuccessResponse<AccountBalance> | ErrorResponse;
    if (result.reply.detail !== "success") {
      throw new Error(result.reply.detail || "NameSilo Error");
    }
    const successResult = result as SuccessResponse<AccountBalance>;
    const { balance } = successResult.reply;
    if (environment.launchType === LaunchType.UserInitiated) {
      await showToast(Toast.Style.Success, `Account Balance: $${balance}`);
    }
    await updateCommandMetadata({
      subtitle: `NameSilo | Account Balance: $${balance}`,
    });
  } catch (err: unknown) {
    if (environment.launchType === LaunchType.UserInitiated) {
      await showFailureToast(err);
    }
  }
}
