import { List, Icon } from "@raycast/api";
import { getMetricTitle } from "../utils/api";

interface LoadingItemProps {
  metric: {
    key: string;
    icon: Icon;
  };
}

export function LoadingItem({ metric }: LoadingItemProps): JSX.Element {
  return (
    <List.Item
      key={metric.key}
      icon={metric.icon}
      title={getMetricTitle(metric.key)}
      accessories={[
        {
          text: "Loading...",
        },
      ]}
    />
  );
}
