import { Color, Icon, launchCommand, LaunchType, MenuBarExtra, open, openExtensionPreferences } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { credentials } from "./lib/preferences";
import { getWallet, SITE_URL } from "./lib/wiro";

const ADD_FUNDS_URL = `${SITE_URL}/panel/wallet/deposit/credit-card`;
const DASHBOARD_URL = `${SITE_URL}/panel`;

function dollars(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

async function openCommand(name: string) {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Could not open the command" });
  }
}

export default function WalletBalance() {
  const { data, isLoading, error, revalidate } = useCachedPromise(() => getWallet(credentials()), [], {
    keepPreviousData: true,
    // A background refresh that fails shows its reason in the menu instead of a toast.
    onError: () => undefined,
  });

  return (
    <MenuBarExtra
      icon={{ source: "menu-bar-icon.png", tintColor: Color.PrimaryText }}
      title={data ? dollars(data.totalUsd) : undefined}
      tooltip="Wiro AI balance"
      isLoading={isLoading}
    >
      {error && !data && (
        <MenuBarExtra.Section title="Could not load the balance">
          <MenuBarExtra.Item title={error.message.slice(0, 80)} />
          <MenuBarExtra.Item title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </MenuBarExtra.Section>
      )}
      {data === null && (
        <MenuBarExtra.Section title="No wallet yet">
          <MenuBarExtra.Item title="Add Funds" icon={Icon.Plus} onAction={() => open(ADD_FUNDS_URL)} />
        </MenuBarExtra.Section>
      )}
      {data && (
        <MenuBarExtra.Section title="Balance">
          <MenuBarExtra.Item title="Total" subtitle={dollars(data.totalUsd)} icon={Icon.Coins} />
          <MenuBarExtra.Item title="Deposits" subtitle={dollars(data.depositUsd)} />
          {data.couponCreditUsd > 0 && (
            <MenuBarExtra.Item title="Coupon Credit" subtitle={dollars(data.couponCreditUsd)} />
          )}
          {data.storeRevenueUsd > 0 && (
            <MenuBarExtra.Item title="Store Revenue" subtitle={dollars(data.storeRevenueUsd)} />
          )}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Add Funds" icon={Icon.CreditCard} onAction={() => open(ADD_FUNDS_URL)} />
        <MenuBarExtra.Item title="Task History" icon={Icon.Clock} onAction={() => openCommand("task-history")} />
        <MenuBarExtra.Item title="Open Dashboard" icon={Icon.Globe} onAction={() => open(DASHBOARD_URL)} />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
