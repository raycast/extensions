import { showHUD, showToast, Toast } from "@raycast/api";
import { getApiClient } from "./lib/accounts";
import { formatCurrency } from "./lib/utils";

export default async function QuickBalance() {
  const api = await getApiClient();
  if (!api) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Mercury account configured",
      message: "Use 'Manage Mercury Accounts' to add one",
    });
    return;
  }

  try {
    const accounts = await api.getAccounts();
    const active = accounts.filter((a) => a.status === "active");
    const total = active.reduce((sum, a) => sum + a.availableBalance, 0);

    const breakdown = active
      .map(
        (a) => `${a.nickname ?? a.name}: ${formatCurrency(a.availableBalance)}`,
      )
      .join(" | ");
    await showHUD(`${formatCurrency(total)} — ${breakdown}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch balance",
      message: String(error),
    });
  }
}