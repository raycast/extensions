import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ApiInfo } from "../api/types";

export interface PlanCapabilities {
  plan: string;
  canAccessExploits: boolean;
  canAccessAlerts: boolean;
  canUseHttpsFilter: boolean;
  canUseTelnetFilter: boolean;
  hasUnlockedResults: boolean;
  isLoading: boolean;
  isPremium: boolean;
}

const PREMIUM_PLANS = [
  "basic",
  "plus",
  "corp",
  "enterprise",
  "edu",
  "small_business",
];

export function usePlanCapabilities(): PlanCapabilities {
  const { apiKey } = getPreferenceValues<Preferences>();

  const { data, isLoading } = useFetch<ApiInfo>(
    `https://api.shodan.io/api-info?key=${apiKey}`,
    {
      keepPreviousData: true,
    },
  );

  const plan = data?.plan?.toLowerCase() ?? "unknown";
  const isPremium = PREMIUM_PLANS.includes(plan);

  return {
    plan: data?.plan ?? "unknown",
    canAccessExploits: isPremium,
    canAccessAlerts: true, // Alerts are available for all plans, but with limits
    canUseHttpsFilter: data?.https ?? false,
    canUseTelnetFilter: data?.telnet ?? false,
    hasUnlockedResults: data?.unlocked ?? false,
    isLoading,
    isPremium,
  };
}

export function getPlanUpgradeUrl(): string {
  return "https://account.shodan.io/billing";
}

export function getRequiredPlanForFeature(
  feature: "exploits" | "https" | "telnet" | "unlocked",
): string {
  switch (feature) {
    case "exploits":
      return "Membership (Basic or higher)";
    case "https":
    case "telnet":
      return "Membership with API access";
    case "unlocked":
      return "Membership with unlocked results";
    default:
      return "Paid Membership";
  }
}
