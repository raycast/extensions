import { Icon, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { StoreItem } from "./types";
import { createStoreDeeplink, scanStoreUpdates } from "./utils";
import { getStoredItemsSync, storeItems, getLastSeen, setLastSeen } from "./utils/store-cache";

const MAX_ITEMS = 12;

export default function Command() {
  // Seed from the synchronous Cache so the first render already has real data.
  const [items, setItems] = useState<StoreItem[]>(() => getStoredItemsSync());
  const [isLoading, setIsLoading] = useState(() => getStoredItemsSync().length === 0);
  const [lastSeen, setLastSeenState] = useState<number>(() => getLastSeen());

  async function scan() {
    try {
      const fresh = await scanStoreUpdates();
      setItems(fresh);
      storeItems(fresh);

      // On first ever run, start from a clean slate: don't flag every already
      // published extension as "new". Only items appearing after this count.
      if (getLastSeen() === 0) {
        const now = Date.now();
        setLastSeen(now);
        setLastSeenState(now);
      }
    } catch (error) {
      console.error("[MenuBar] Store updates scan failed:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    scan();
  }, []);

  const unseen = items.filter((item) => new Date(item.date).getTime() > lastSeen);
  const count = unseen.length;
  const title = count > 0 ? `${count}` : undefined;
  const tooltip = isLoading
    ? "Checking the Raycast Store…"
    : count > 0
      ? `${count} new or updated extension${count !== 1 ? "s" : ""}`
      : "No new store updates";

  const markAllSeen = () => {
    const newest = items.reduce((max, item) => Math.max(max, new Date(item.date).getTime()), Date.now());
    setLastSeen(newest);
    setLastSeenState(newest);
  };

  const shown = (count > 0 ? unseen : items).slice(0, MAX_ITEMS);

  return (
    <MenuBarExtra icon="store-updates-icon.png" title={title} tooltip={tooltip} isLoading={isLoading}>
      {items.length === 0 && !isLoading && <MenuBarExtra.Item title="No store updates" icon={Icon.CheckCircle} />}

      {shown.length > 0 && (
        <MenuBarExtra.Section title={count > 0 ? "New & Updated" : "Recent"}>
          {shown.map((item) => (
            <MenuBarExtra.Item
              key={item.id}
              icon={item.type === "new" ? Icon.StarCircle : Icon.ArrowUpCircle}
              title={item.title}
              subtitle={item.type === "new" ? "New" : "Updated"}
              onAction={() => open(createStoreDeeplink(item.url))}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Separator />

      {count > 0 && <MenuBarExtra.Item title="Mark All as Seen" icon={Icon.CheckCircle} onAction={markAllSeen} />}
      <MenuBarExtra.Item
        title="View Store Updates"
        icon={Icon.AppWindowGrid3x3}
        onAction={() => launchCommand({ name: "view-store-updates", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Item
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={scan}
      />
    </MenuBarExtra>
  );
}
