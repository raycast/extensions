import { popToRoot, open, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { API_HEADERS, API_URL } from "./constants";
import { parseImprovMXResponse } from "./utils";
import { showFailureToast } from "@raycast/utils";

export default async () => {
  try {
    await showToast(Toast.Style.Animated, "Generating Login Link");
    const response = await fetch(API_URL + "account/generate-login-link", {
      headers: API_HEADERS,
    });
    // @ts-expect-error Response type is incompatible
    const result = await parseImprovMXResponse<{ account: string }>(response, { pagination: false });

    const { data } = result;
    const account = "https://app.improvmx.com/auth/" + data.account;
    await showToast(Toast.Style.Success, "ImprovMX", "Login link copied to clipboard");
    await open(account);
    await popToRoot({
      clearSearchBar: true,
    });
  } catch (error) {
    await showFailureToast(error, { title: "ImprovMX Error" });
    return;
  }
};
