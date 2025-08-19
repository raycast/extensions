import { Detail, List, Icon, Color } from "@raycast/api";
import { useV0Api } from "./hooks/useV0Api";
import { useActiveProfile } from "./hooks/useActiveProfile";

interface TokenBillingData {
  plan: string;
  billingMode?: "test";
  role: string;
  billingCycle: {
    start: number;
    end: number;
  };
  balance: {
    remaining: number;
    total: number;
  };
  onDemand: {
    balance: number;
    blocks?: {
      expirationDate?: number;
      effectiveDate: number;
      originalBalance: number;
      currentBalance: number;
    }[];
  };
}

interface LegacyBillingData {
  remaining?: number;
  reset?: number;
  limit: number;
}

interface BillingResponse {
  billingType: "token" | "legacy";
  data: TokenBillingData | LegacyBillingData;
}

interface PlanResponse {
  object: "plan";
  plan: string;
  billingCycle: {
    start: number;
    end: number;
  };
  balance: {
    remaining: number;
    total: number;
  };
}

export default function ViewBillingCommand() {
  const { activeProfileApiKey, isLoadingProfileDetails } = useActiveProfile();

  const commonHeaders = activeProfileApiKey
    ? {
        Authorization: `Bearer ${activeProfileApiKey}`,
        "Content-Type": "application/json",
      }
    : undefined;

  const { isLoading, data, error } = useV0Api<BillingResponse>(
    activeProfileApiKey ? "https://api.v0.dev/v1/user/billing" : "",
    {
      headers: commonHeaders,
      execute: !!activeProfileApiKey && !isLoadingProfileDetails,
    },
  );

  const {
    isLoading: isLoadingPlan,
    data: planData,
    error: planError,
  } = useV0Api<PlanResponse>(activeProfileApiKey ? "https://api.v0.dev/v1/user/plan" : "", {
    headers: commonHeaders,
    execute: !!activeProfileApiKey && !isLoadingProfileDetails,
  });

  if (error || planError) {
    return <Detail markdown={`Error: ${error?.message || planError?.message}`} />;
  }

  if (isLoading || isLoadingPlan || isLoadingProfileDetails) {
    return (
      <List navigationTitle="v0 Billing">
        <List.EmptyView title="Loading..." description="Fetching your billing information..." />
      </List>
    );
  }

  if (!data && !planData) {
    return <Detail markdown="No billing information available." />;
  }

  const billingItems: React.ReactElement[] = [];

  if (planData?.billingCycle) {
    billingItems.push(
      <List.Section title="Plan Information" key="plan-info">
        <List.Item title="Current Plan" subtitle={planData.plan} icon={Icon.Stars} />
        <List.Item
          title="Plan Billing Cycle Start"
          subtitle={new Date(planData.billingCycle.start).toLocaleDateString()}
          icon={Icon.Calendar}
        />
        <List.Item
          title="Plan Billing Cycle End"
          subtitle={new Date(planData.billingCycle.end).toLocaleDateString()}
          icon={Icon.Calendar}
        />
        <List.Item
          title="Plan Balance Remaining"
          subtitle={planData.balance.remaining.toString()}
          icon={{ source: Icon.Wallet, tintColor: planData.balance.remaining > 0 ? Color.Green : Color.Red }}
        />
        <List.Item title="Plan Total Balance" subtitle={planData.balance.total.toString()} icon={Icon.Wallet} />
      </List.Section>,
    );
  }

  if (data) {
    if (data.billingType === "token") {
      const billing = data.data as TokenBillingData;

      billingItems.push(
        <List.Section title="Token Billing Details" key="token-details">
          <List.Item title="Plan" subtitle={billing.plan} icon={Icon.Stars} />
          {billing.billingMode && <List.Item title="Billing Mode" subtitle={billing.billingMode} icon={Icon.Cog} />}
          <List.Item title="Role" subtitle={billing.role} icon={Icon.Person} />
          <List.Item
            title="Billing Cycle Start"
            subtitle={new Date(billing.billingCycle.start).toLocaleDateString()}
            icon={Icon.Calendar}
          />
          <List.Item
            title="Billing Cycle End"
            subtitle={new Date(billing.billingCycle.end).toLocaleDateString()}
            icon={Icon.Calendar}
          />
          <List.Item
            title="Balance Remaining"
            subtitle={billing.balance.remaining.toString()}
            icon={{ source: Icon.Wallet, tintColor: billing.balance.remaining > 0 ? Color.Green : Color.Red }}
          />
          <List.Item title="Total Balance" subtitle={billing.balance.total.toString()} icon={Icon.Wallet} />
          <List.Item title="On-Demand Balance" subtitle={billing.onDemand.balance.toString()} icon={Icon.Bolt} />
        </List.Section>,
      );

      if (billing.onDemand.blocks && billing.onDemand.blocks.length > 0) {
        billingItems.push(
          <List.Section title="On-Demand Blocks" key="on-demand-blocks">
            {billing.onDemand.blocks.map((block, index) => (
              <List.Item
                key={`block-${block.effectiveDate}-${block.originalBalance}`}
                title={`Block ${index + 1}`}
                subtitle={`Current: ${block.currentBalance} / Original: ${block.originalBalance}`}
                icon={Icon.Box}
                accessories={
                  [
                    {
                      text: `Effective: ${new Date(block.effectiveDate).toLocaleDateString()}`,
                      icon: Icon.ArrowRight,
                    },
                    block.expirationDate
                      ? {
                          text: `Expires: ${new Date(block.expirationDate).toLocaleDateString()}`,
                          icon: Icon.Calendar,
                        }
                      : undefined,
                  ].filter(Boolean) as List.Item.Accessory[]
                }
              />
            ))}
          </List.Section>,
        );
      }
    } else if (data.billingType === "legacy") {
      const billing = data.data as LegacyBillingData;

      billingItems.push(
        <List.Section title="Legacy Billing Details" key="legacy-details">
          {billing.remaining !== undefined && (
            <List.Item
              title="Remaining"
              subtitle={billing.remaining.toString()}
              icon={{ source: Icon.Wallet, tintColor: billing.remaining > 0 ? Color.Green : Color.Red }}
            />
          )}
          {billing.reset && (
            <List.Item
              title="Reset Date"
              subtitle={new Date(billing.reset).toLocaleDateString()}
              icon={Icon.Calendar}
            />
          )}
          <List.Item title="Limit" subtitle={billing.limit.toString()} icon={Icon.HardDrive} />
        </List.Section>,
      );
    }
  }

  return <List navigationTitle="v0 Billing">{billingItems}</List>;
}
