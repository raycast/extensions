import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { getPlanUpgradeUrl } from "../hooks/usePlanCapabilities";

interface PremiumFeatureNoticeProps {
  feature: string;
  requiredPlan: string;
  currentPlan: string;
  description?: string;
}

export function PremiumFeatureNotice({
  feature,
  requiredPlan,
  currentPlan,
  description,
}: PremiumFeatureNoticeProps) {
  return (
    <List.EmptyView
      title={`${feature} Requires Upgrade`}
      description={
        description ||
        `This feature requires a ${requiredPlan}.\n\nYour current plan: ${currentPlan.toUpperCase()}\n\nUpgrade your Shodan plan to access this feature.`
      }
      icon={{ source: Icon.Lock, tintColor: Color.Orange }}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Upgrade Plan"
            url={getPlanUpgradeUrl()}
            icon={Icon.ArrowUpCircle}
          />
          <Action.OpenInBrowser
            title="View Shodan Plans"
            url="https://account.shodan.io/billing"
          />
        </ActionPanel>
      }
    />
  );
}

export function PremiumBadge() {
  return {
    tag: { value: "Premium", color: Color.Orange },
    icon: { source: Icon.Star, tintColor: Color.Orange },
  };
}
