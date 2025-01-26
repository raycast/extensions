import { getPreferenceValues, openExtensionPreferences, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { fetch } from "cross-fetch";

interface Preferences {
  token: string;
}

const connectingToast = new Toast({
  style: Toast.Style.Animated,
  title: "Couldn't Connect to Cider",
  message: "Attempting to connect again.",
});

let toastShowed = false;

export function callCider(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: object,
  willTryAgain: boolean = false,
): Promise<object> {
  const { token } = getPreferenceValues<Preferences>();
  const headers: { apptoken: string; "Content-Type"?: string } = {
    apptoken: token,
  };
  if (body) headers["Content-Type"] = "application/json";
  return new Promise((resolve) => {
    fetch("http://localhost:10767/api/v1" + path, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers,
      signal: AbortSignal.timeout(2000),
    })
      .then(async (res) => {
        await connectingToast.hide();
        const data = await res.json();
        if (data.error && data.error === "UNAUTHORIZED_APP_TOKEN") {
          await showHUD("❌ Invalid Token. Please Enter a Correct One.", {
            popToRootType: PopToRootType.Immediate,
          });
          await openExtensionPreferences();
          return;
        }
        resolve(data);
      })
      .catch(async () => {
        if (!willTryAgain) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Couldn't Connect to Cider",
            message: "Make sure Cider is running and try again.",
          });
          return;
        }
        if (toastShowed) return;
        await connectingToast.show();
        toastShowed = true;
      });
  });
}

export async function seekTo(position: number) {
  await callCider("/playback/seek", "POST", { position });
}
