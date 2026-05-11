import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { HakunaTimer } from "./hakuna-api";

interface Preferences {
  apiToken: string;
}

export default async function command() {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.apiToken) {
    await showToast({
      style: Toast.Style.Failure,
      title: "API Token missing",
      message: "Please set your Hakuna API Token in the extension preferences",
    });
    return;
  }

  const timer = new HakunaTimer(preferences.apiToken);

  try {
    const vacationDays = await timer.getVacationDays();
    const [redeemed, remaining] = vacationDays.split("/");
    await showToast({
      style: Toast.Style.Success,
      title: "Vacation Days",
      message: `Used: ${redeemed}, Remaining: ${remaining}`,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error details:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error getting vacation days",
        message: error.message,
      });
    } else {
      console.error("Unknown error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error getting vacation days",
        message: "An unknown error occurred. Check the logs for more details.",
      });
    }
  }
}
