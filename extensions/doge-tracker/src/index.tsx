import { List, ActionPanel, Action, Icon, updateCommandMetadata } from "@raycast/api";
import { useState, useEffect } from "react";
import { Initiative, getInitiatives } from "./firebase";
import { formatCurrency, formatCompactCurrency } from "./utils";

function truncateTitle(title: string, maxLength = 80): string {
  if (title.length <= maxLength) return title;

  const lastSpace = title.lastIndexOf(" ", maxLength - 3);

  if (lastSpace === -1 || lastSpace < maxLength * 0.8) {
    return `${title.substring(0, maxLength - 3)}...`;
  }

  return `${title.substring(0, lastSpace)}...`;
}

export default function Command() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const data = await getInitiatives();
      setInitiatives(data);
      setIsLoading(false);

      // Update command subtitle with stats
      const totalValue = data.reduce((sum, init) => sum + init.value, 0);
      const completedCount = data.filter((i) => i.progress).length;
      const subtitle = `Total Savings: ${formatCompactCurrency(totalValue)}      Total Initiatives: ${completedCount}`;
      await updateCommandMetadata({ subtitle });
    }
    fetchData();
  }, []);

  const totalValue = initiatives.reduce((sum, init) => sum + init.value, 0);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search initiatives...">
      <List.Section title={`Total Savings: ${formatCompactCurrency(totalValue)}`}>
        {initiatives.map((initiative) => (
          <List.Item
            key={initiative.id}
            icon={initiative.progress ? Icon.CheckCircle : Icon.Circle}
            title={truncateTitle(initiative.title)}
            accessoryTitle={formatCompactCurrency(initiative.value)}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={initiative.source} />
                <Action.CopyToClipboard content={initiative.source} title="Copy Source URL" />
                <Action.CopyToClipboard content={formatCurrency(initiative.value)} title="Copy Value" />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
