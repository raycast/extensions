import { showHUD, showToast, Toast } from "@raycast/api";
import { getIPAddresses } from "./utils";
import { execute } from "./cli";

const MAX_DISCOVERY_ATTEMPTS = 2;
const TOAST_DELAY_MS = 500;

export async function executeCommand(baseArgs: string[], errorMessage: string) {
  const ipAddresses = getIPAddresses();

  if (ipAddresses) {
    try {
      await execute(["--ip-address", ipAddresses, ...baseArgs]);
    } catch (error) {
      console.log(error);
      await showHUD(errorMessage);
    }
  } else {
    let toast: Toast | null = null;
    const toastTimer = setTimeout(async () => {
      toast = await showToast({ style: Toast.Style.Animated, title: "Discovering light(s)…" });
    }, TOAST_DELAY_MS);

    for (let attempt = 1; attempt <= MAX_DISCOVERY_ATTEMPTS; attempt++) {
      try {
        await execute(["--timeout", "15", ...baseArgs]);
        clearTimeout(toastTimer);
        await toast?.hide();
        return;
      } catch (error) {
        console.log(error);

        if (attempt < MAX_DISCOVERY_ATTEMPTS) {
          clearTimeout(toastTimer);
          if (!toast) {
            toast = await showToast({ style: Toast.Style.Animated, title: "Light(s) not found, retrying…" });
          } else {
            toast.title = "Light(s) not found, retrying…";
          }
        } else {
          clearTimeout(toastTimer);
          if (!toast) {
            toast = await showToast({
              style: Toast.Style.Failure,
              title: "Could not find light(s) — check power or set IP in preferences.",
            });
          } else {
            toast.style = Toast.Style.Failure;
            toast.title = "Could not find light(s) — check power or set IP in preferences.";
          }
        }
      }
    }
  }
}
