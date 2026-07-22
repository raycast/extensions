import { Icon, LaunchType, MenuBarExtra, launchCommand, open, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { APP_URL, getTaxDeadlines, getUnpaidInvoices } from "./api";
import { eur, eurCompact } from "./helpers";

async function fetchStatus() {
  const [unpaid, overdue, dueToday] = await Promise.all([
    getUnpaidInvoices(),
    getTaxDeadlines("overdue"),
    getTaxDeadlines("due_today"),
  ]);

  const unpaidTotal = unpaid.items.reduce((sum, i) => sum + (i.amount_due ?? 0), 0);

  return {
    unpaidCount: unpaid.total,
    unpaidTotal,
    overdueTaxes: overdue.total,
    dueTodayTaxes: dueToday.total,
  };
}

export default function MenuBar() {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchStatus, [], { keepPreviousData: true });

  const hasAlert = (data?.overdueTaxes ?? 0) > 0 || (data?.dueTodayTaxes ?? 0) > 0;
  const title = data && data.unpaidTotal > 0 ? eurCompact(data.unpaidTotal) : undefined;

  return (
    <MenuBarExtra
      icon={{ source: { light: "icon.png", dark: "icon.png" } }}
      title={title}
      tooltip="Onesto — unpaid invoices and tax deadlines"
      isLoading={isLoading}
    >
      {error ? (
        <>
          <MenuBarExtra.Item title="Cannot reach Onesto" subtitle={error.message} icon={Icon.ExclamationMark} />
          <MenuBarExtra.Item title="Check API Key…" icon={Icon.Key} onAction={() => openExtensionPreferences()} />
        </>
      ) : (
        <>
          <MenuBarExtra.Section title="Invoices">
            <MenuBarExtra.Item
              title={
                data
                  ? data.unpaidCount > 0
                    ? `Unpaid: ${data.unpaidCount} (${eur(data.unpaidTotal)})`
                    : "All invoices collected"
                  : "Loading…"
              }
              icon={data && data.unpaidCount > 0 ? Icon.Receipt : Icon.CheckCircle}
              onAction={() => {
                void launchCommand({ name: "unpaid-invoices", type: LaunchType.UserInitiated });
              }}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="Taxes">
            <MenuBarExtra.Item
              title={
                data
                  ? hasAlert
                    ? `Overdue: ${data.overdueTaxes} · Due today: ${data.dueTodayTaxes}`
                    : "No urgent tax deadlines"
                  : "Loading…"
              }
              icon={hasAlert ? Icon.ExclamationMark : Icon.Calendar}
              onAction={() => {
                void launchCommand({ name: "tax-deadlines", type: LaunchType.UserInitiated });
              }}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Open Onesto"
              icon={Icon.Globe}
              onAction={() => {
                void open(APP_URL);
              }}
            />
            <MenuBarExtra.Item
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                revalidate();
              }}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
