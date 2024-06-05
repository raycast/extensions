import { getPreferenceValues, popToRoot, open, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";

export default async () => {
  const API_TOKEN = getPreferenceValues().api_token;
  const API_URL = "https://api.improvmx.com/v3/";
  const auth = Buffer.from("api:" + API_TOKEN).toString("base64");

  try {
    const response = await fetch(API_URL + "account/generate-login-link", {
      method: "GET",
      headers: {
        Authorization: "Basic " + auth,
        "content-type": "application/json",
      },
    });

    if (!response.ok) {
      const error = (await response.json()) as { error: string };
      await showToast(Toast.Style.Failure, "ImprovMX Error", error.error);
      return;
    }

    const data = (await response.json()) as { account: string };
    const account = "https://app.improvmx.com/auth/" + data.account;
    await showToast(Toast.Style.Success, "ImprovMX", "Login link copied to clipboard");
    await open(account);
    await popToRoot({
      clearSearchBar: true,
    });
  } catch (error: any) {
    await showToast(
      Toast.Style.Failure,
      "ImprovMX Error",
      "There was an error with your request. Make sure you are connected to the internet."
    );
    return;
  }
};


// import { popToRoot, open, showToast, Toast } from "@raycast/api";
// import { parseImprovMXResponse } from "./utils";
// import { API_HEADERS, API_URL } from "./constants";
// import { useFetch } from "@raycast/utils";

// export default () => {
//   useFetch(API_URL + "account/generate-login-link", {
//     headers: API_HEADERS,
//     async parseResponse(response) {
//       return await parseImprovMXResponse<{ account: string }>(response, false);
//     },
//     async onWillExecute() {
//       await showToast(Toast.Style.Animated, "Generating Login Link");
//     },
//     mapResult(result) {
//       return {
//         data: result.data
//       }
//     },
//     async onData(data) {
//       const account = "https://app.improvmx.com/auth/" + data.account;
//       await showToast(Toast.Style.Success, "ImprovMX", "Login link copied to clipboard");
//       await open(account);
//       await popToRoot({
//         clearSearchBar: true,
//       });
//     },
//   })
// };
