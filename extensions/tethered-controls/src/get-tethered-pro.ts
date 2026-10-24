import { showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { readStoredData } from "./read-stored-items";
import { isTetheredRunning, sendToTethered } from "./send-to-tethered";

type CheckoutResponse = {
  request: string;
  state: "starting" | "opened" | "alreadyPro" | "signInRequired" | "error";
  message?: string;
};

function isCheckoutResponse(value: unknown, request: string): value is CheckoutResponse {
  if (typeof value !== "object" || value === null) return false;
  const response = value as Record<string, unknown>;
  return (
    response.request === request &&
    (response.state === "starting" ||
      response.state === "opened" ||
      response.state === "alreadyPro" ||
      response.state === "signInRequired" ||
      response.state === "error") &&
    (response.message === undefined || typeof response.message === "string")
  );
}

export default async function Command(): Promise<void> {
  const request = crypto.randomUUID();
  try {
    await sendToTethered(`tethered://checkout?request=${request}`);
    let didReachTethered = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const value = await readStoredData("raycastCheckout").catch(() => undefined);
      if (isCheckoutResponse(value, request)) {
        didReachTethered = true;
        switch (value.state) {
          case "starting":
            break;
          case "opened":
            await showHUD("Tethered Pro checkout opened in your browser");
            return;
          case "alreadyPro":
            await showHUD("Tethered Pro is already active on this Mac");
            return;
          case "signInRequired":
            await showToast({
              style: Toast.Style.Failure,
              title: "Sign in to Tethered before purchasing Pro",
            });
            return;
          case "error":
            await showToast({
              style: Toast.Style.Failure,
              title: "Could not open Tethered checkout",
              message: value.message,
            });
            return;
        }
      }
      if (attempt === 14 && !didReachTethered && !(await isTetheredRunning().catch(() => true))) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Please install and open Tethered",
          message: "An updated Tethered app must be running to start checkout.",
        });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Tethered checkout is taking longer than expected",
      message: "Try again or open Tethered to check the purchase state.",
    });
  } catch (error) {
    await showFailureToast(error, { title: "Could not contact Tethered" });
  }
}
