import { Color, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import type { BillingBlock } from "../lib/billingBlockSummary/billingBlockSummary";
import { renderBlockDetail } from "../lib/billingBlockDetail";
import { formatCurrency } from "../../common/lib/formatUsageValue/formatUsageValue";

type BillingSectionProps = {
  actions: ReactNode;
  currentBlock?: BillingBlock;
};

export const BillingSection = ({
  actions,
  currentBlock,
}: BillingSectionProps) => (
  <List.Section title="Billing">
    {currentBlock ? (
      <List.Item
        id="currentBlock"
        title="Current 5-Hour Block"
        icon={{ source: Icon.Gauge, tintColor: Color.Purple }}
        accessories={[
          {
            text: formatCurrency(currentBlock.costUSD),
            tooltip: "Current cost",
          },
        ]}
        detail={<List.Item.Detail markdown={renderBlockDetail(currentBlock)} />}
        actions={actions}
      />
    ) : (
      <List.Item
        id="noCurrentBlock"
        title="No Active Billing Block"
        icon={{ source: Icon.CircleDisabled, tintColor: Color.SecondaryText }}
        accessories={[{ tag: { value: "Idle", color: Color.SecondaryText } }]}
        actions={actions}
      />
    )}
  </List.Section>
);
