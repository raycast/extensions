import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { Subscription, SubscriptionStatus } from "./types";
import { formatCurrency, getNextBillingDate } from "./utils";

const STORAGE_KEY = "subscriptions-v1";

function diffDays(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function NotificationBackground() {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return;

  let parsed: Record<string, unknown>[];
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  const subscriptions: Subscription[] = parsed.map((s: Record<string, unknown>) => {
    const rawStatus = s.status as string | undefined;
    const status: SubscriptionStatus =
      rawStatus === "active" || rawStatus === "paused"
        ? rawStatus
        : ((s.isActive as boolean) ?? true)
          ? "active"
          : "paused";
    return { ...s, status } as Subscription;
  });

  const prefs = getPreferenceValues<Preferences>();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const reminders = [
    { key: "first", days: prefs.firstReminderDays, time: prefs.firstReminderTime },
    { key: "second", days: prefs.secondReminderDays, time: prefs.secondReminderTime },
  ].filter((r) => r.days !== "disabled");

  for (const sub of subscriptions.filter((s) => s.status === "active")) {
    const nextBilling = getNextBillingDate(sub);
    if (!nextBilling) continue;

    const daysUntil = diffDays(today, nextBilling);
    const billingKey = `${nextBilling.getFullYear()}-${nextBilling.getMonth()}-${nextBilling.getDate()}`;

    for (const reminder of reminders) {
      if (daysUntil !== parseInt(reminder.days)) continue;

      const [hour, minute] = reminder.time.split(":").map(Number);
      const timePassed = now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute);
      if (!timePassed) continue;

      const notifKey = `notif-${sub.id}-${billingKey}-${reminder.key}`;
      if (await LocalStorage.getItem<string>(notifKey)) continue;

      const body =
        daysUntil === 0
          ? `${sub.name} bills today · ${formatCurrency(sub.amount, sub.currency)}`
          : `${sub.name} bills in ${daysUntil} day${daysUntil > 1 ? "s" : ""} · ${formatCurrency(sub.amount, sub.currency)}`;

      await runAppleScript(`display notification "${body.replace(/"/g, '\\"')}" with title "Subscription Due"`);
      await LocalStorage.setItem(notifKey, "1");
    }
  }
}
