import { List, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { UsageStatsManager } from "../utils/usage-stats";

interface FrequentlyUsedSectionProps {
  displaySize: "small" | "medium" | "large";
  onItemSelect: (itemId: string) => void;
  items: { id: string; title: string; icon?: string }[];
}

const getMaxItems = (displaySize: "small" | "medium" | "large"): number => {
  switch (displaySize) {
    case "small":
      return 8;
    case "medium":
      return 6;
    case "large":
      return 4;
  }
};

export function FrequentlyUsedSection({
  displaySize,
  onItemSelect,
  items,
}: FrequentlyUsedSectionProps) {
  const [frequentItemIds, setFrequentItemIds] = useState<string[]>([]);
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    const loadFrequentItems = async () => {
      const hasUsageHistory = await UsageStatsManager.hasUsageHistory();
      setHasHistory(hasUsageHistory);

      if (hasUsageHistory) {
        const ids = await UsageStatsManager.getFrequentlyUsed(
          getMaxItems(displaySize),
        );
        setFrequentItemIds(ids);
      }
    };

    loadFrequentItems();
  }, [displaySize]);

  if (!hasHistory || frequentItemIds.length === 0) {
    return null;
  }

  const frequentItems = items
    .filter((item) => frequentItemIds.includes(item.id))
    .sort(
      (a, b) => frequentItemIds.indexOf(a.id) - frequentItemIds.indexOf(b.id),
    );

  return (
    <List.Section title="Frequently Used">
      {frequentItems.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          icon={item.icon}
          accessories={[{ text: "Frequently Used" }]}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => onItemSelect(item.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
