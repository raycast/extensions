import { showToast, Toast } from "@raycast/api";
import checkLendingRates from "./lib/task/checkLendingRates";

export default async function run() {
  try {
    await checkLendingRates();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    showToast({
      title: "Check Lending Rates Failed",
      style: Toast.Style.Failure,
      message,
    });
  }
}
