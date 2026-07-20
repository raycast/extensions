import { Color, Icon, List } from "@raycast/api";
import { Breach } from "../utils/types";
import { HibpActions } from "./hibp-actions";
import { breachMarkdown } from "../utils/markdown";
import { formatDate, formatNumber } from "../utils/format";

interface BreachListProps {
  breaches: Breach[];
  isLoading: boolean;
  subtitle?: string;
}

export const BreachList = ({ breaches, isLoading, subtitle }: BreachListProps) => (
  <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search breaches...">
    {breaches.map((breach) => (
      <List.Item
        key={breach.Name}
        icon={breach.LogoPath ? { source: breach.LogoPath } : { source: Icon.Globe, tintColor: Color.Blue }}
        title={breach.Title}
        subtitle={subtitle ?? breach.Domain}
        accessories={[
          { text: formatDate(breach.BreachDate), tooltip: "Breach date" },
          { text: formatNumber(breach.PwnCount) + " accounts", tooltip: "Accounts affected" },
        ]}
        detail={<List.Item.Detail markdown={breachMarkdown(breach)} />}
        actions={<HibpActions copyContent={JSON.stringify(breach, null, 2)} copyTitle="Copy JSON" />}
      />
    ))}
  </List>
);
