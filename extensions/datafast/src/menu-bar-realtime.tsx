import {
  MenuBarExtra,
  open,
  LaunchType,
  launchCommand,
  Icon,
  LocalStorage,
  showHUD,
  environment,
  updateCommandMetadata,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { fetchRealtimeMap } from "./lib/api";
import { formatNumber, formatCompact } from "./lib/format";

const LAST_SEEN_KEY = "last-seen-payment-timestamps";

async function checkForNewSales(
  payments: Array<{ amount: number; currency: string; timestamp: string }>,
) {
  try {
    if (payments.length === 0) return;

    const storedRaw = await LocalStorage.getItem<string>(LAST_SEEN_KEY);
    const seenSet = new Set<string>(storedRaw ? JSON.parse(storedRaw) : []);

    const newPayments = payments.filter((p) => {
      const key = `${p.timestamp}-${p.amount}-${p.currency}`;
      return !seenSet.has(key);
    });

    const allKeys = payments.map(
      (p) => `${p.timestamp}-${p.amount}-${p.currency}`,
    );
    await LocalStorage.setItem(LAST_SEEN_KEY, JSON.stringify(allKeys));

    if (
      newPayments.length > 0 &&
      environment.launchType === LaunchType.Background
    ) {
      const total = newPayments.reduce((sum, p) => sum + p.amount, 0);
      const currency = newPayments[0].currency || "$";
      const label =
        newPayments.length === 1
          ? `New sale: ${currency}${newPayments[0].amount}`
          : `${newPayments.length} new sales: ${currency}${total}`;

      await open("raycast://confetti");
      await showHUD(`🎉 ${label}`);
    }
  } catch {
    // Silently fail on background polls
  }
}

export default function MenuBarRealtime() {
  const { data, isLoading } = useCachedPromise(fetchRealtimeMap, []);

  const count = data?.count ?? data?.visitors?.length ?? 0;

  useEffect(() => {
    if (data?.recentPayments) {
      checkForNewSales(data.recentPayments);
    }
    updateCommandMetadata({ subtitle: null });
  }, [data]);

  return (
    <MenuBarExtra
      icon="menubar-icon.svg"
      title={data ? formatCompact(count) : undefined}
      tooltip="Datafast — Active Visitors"
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="Active Visitors">
        <MenuBarExtra.Item
          title={
            data ? `${formatNumber(count)} visitors right now` : "Loading..."
          }
          icon={Icon.Person}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View Realtime Details"
          icon={Icon.Eye}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() =>
            launchCommand({
              name: "realtime-visitors",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Open Dashboard"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open("https://datafa.st")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
