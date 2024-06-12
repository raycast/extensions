import { Toast, showToast, updateCommandMetadata } from "@raycast/api";
import { type AccountBalance, ErrorResponse, SuccessResponse } from "./lib/types";
import fetch from "cross-fetch";
import { API_PARAMS, API_URL } from "./lib/constants";
import { showFailureToast } from "@raycast/utils";

export default async function AccountBalance() {
        try {
            await showToast(Toast.Style.Animated, "Fetching Account Balance");
          const response = await fetch(API_URL + "getAccountBalance?" + API_PARAMS.toString());
          const result = await response.json() as SuccessResponse<AccountBalance> | ErrorResponse;
          if (result.reply.detail!=="success") {
            throw new Error(result.reply.detail);
        }
        const successResult = result as SuccessResponse<AccountBalance>;
        const { balance } = successResult.reply;
        await showToast(Toast.Style.Success, `Account Balance: ${balance}`);
        await updateCommandMetadata({
            subtitle: `NameSilo | Account Balance: ${balance}`
        })
        } catch (err: unknown) {
          await showFailureToast(err);
        }
}