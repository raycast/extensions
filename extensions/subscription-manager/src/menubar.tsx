import { Icon, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useSubscriptions } from "./storage";
import { Subscription } from "./types";
import {
  formatCurrency,
  formatCycle,
  getMonthSubscriptions,
  getMonthlyTotal,
  getSubscriptionsForDay,
  getSubscriptionIcon,
} from "./utils";

interface RatesResponse {
  rates: Record<string, number>;
}

export default function MenubarCommand() {
  const { subscriptions, isLoading } = useSubscriptions();
  const prefs = getPreferenceValues<Preferences.Menubar>();
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const monthName = today.toLocaleString("default", { month: "long" });

  const { data: ratesData } = useFetch<RatesResponse>(
    `https://api.frankfurter.app/latest?from=${prefs.primaryCurrency}`,
    { keepPreviousData: true },
  );

  const monthlyTotal = getMonthlyTotal(subscriptions, month, year, prefs.primaryCurrency, ratesData?.rates);
  const totalStr = isLoading ? "" : formatCurrency(monthlyTotal, prefs.primaryCurrency);
  const showInTitle = (prefs.showTotalIn ?? "dropdown") !== "dropdown";

  const todaySubs = getSubscriptionsForDay(today.getDate(), month, year, subscriptions);

  const upcomingDays: { date: Date; subs: Subscription[] }[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(year, month, today.getDate() + i);
    const subs = getSubscriptionsForDay(d.getDate(), d.getMonth(), d.getFullYear(), subscriptions);
    if (subs.length > 0) upcomingDays.push({ date: d, subs });
  }

  const allThisMonth = getMonthSubscriptions(month, year, subscriptions);

  async function openCalendar() {
    await launchCommand({ name: "manage-subscription", type: LaunchType.UserInitiated });
  }

  const content = prefs.dropdownContent ?? "full-month";
  const activeCount = subscriptions.filter((s) => s.status === "active").length;

  const menuContent = (
    <>
      {!showInTitle && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={`Monthly Total: ${totalStr}`} icon={Icon.BankNote} onAction={openCalendar} />
        </MenuBarExtra.Section>
      )}

      {content === "minimal" && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={`${activeCount} active subscription${activeCount !== 1 ? "s" : ""}`}
            icon={Icon.List}
            onAction={openCalendar}
          />
          {todaySubs.length > 0 && (
            <MenuBarExtra.Item
              title={`${todaySubs.length} due today`}
              icon="subscription-icon.png"
              onAction={openCalendar}
            />
          )}
        </MenuBarExtra.Section>
      )}

      {content !== "minimal" && todaySubs.length > 0 && (
        <MenuBarExtra.Section title="Due Today">
          {todaySubs.map((sub) => (
            <MenuBarExtra.Item
              key={sub.id}
              title={sub.name}
              subtitle={`${formatCurrency(sub.amount, sub.currency)} ${formatCycle(sub.billingCycle)}`}
              icon={getSubscriptionIcon(sub)}
              onAction={openCalendar}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {content !== "minimal" && upcomingDays.length > 0 && (
        <MenuBarExtra.Section title="Next 7 Days">
          {upcomingDays.map(({ date, subs }) =>
            subs.map((sub) => (
              <MenuBarExtra.Item
                key={`${sub.id}-${date.getDate()}`}
                title={sub.name}
                subtitle={`${date.getDate()} ${date.toLocaleString("default", { month: "short" })} · ${formatCurrency(sub.amount, sub.currency)}`}
                icon={getSubscriptionIcon(sub)}
                onAction={openCalendar}
              />
            )),
          )}
        </MenuBarExtra.Section>
      )}

      {content === "full-month" && (
        <MenuBarExtra.Section title={`${monthName} ${year}`}>
          {allThisMonth.map((sub) => (
            <MenuBarExtra.Item
              key={sub.id}
              title={sub.name}
              subtitle={`${sub.billingDay} · ${formatCurrency(sub.amount, sub.currency)} ${formatCycle(sub.billingCycle)}`}
              icon={getSubscriptionIcon(sub)}
              onAction={openCalendar}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Add Subscription"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() => launchCommand({ name: "add-subscription", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="All Subscriptions"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={() => launchCommand({ name: "subscription-list", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Open Calendar"
          icon={Icon.Calendar}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={openCalendar}
        />
      </MenuBarExtra.Section>
    </>
  );

  if (showInTitle) {
    return (
      <MenuBarExtra icon="subscription-icon.png" title={totalStr} isLoading={isLoading}>
        {menuContent}
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra icon="subscription-icon.png" isLoading={isLoading}>
      {menuContent}
    </MenuBarExtra>
  );
}
