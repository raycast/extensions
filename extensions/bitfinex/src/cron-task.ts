import { showToast, Toast } from "@raycast/api";
import { checkLendingRates, checkAvailableFunding, autoRenewOrders } from "./lib/tasks";
import { getPreferenceValues } from "./lib/preference";

const runTask = async (title: string, task: () => Promise<void>) => {
  try {
    await task();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    showToast({
      title: `${title} Failed`,
      style: Toast.Style.Failure,
      message,
    });
  }
};

export default async function run() {
  const { auto_renew, notify_available, notify_high_rate } = getPreferenceValues();

  if (notify_high_rate) {
    await runTask("Check Lending Rates", checkLendingRates);
  }

  if (notify_available) {
    await runTask("Check Available Funding", checkAvailableFunding);
  }

  if (auto_renew) {
    await runTask("Auto Renew Orders", autoRenewOrders);
  }
}
