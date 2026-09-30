/**
 * Transfer history list component.
 */

import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import type { TransferWiseTransfer } from "../../api/endpoints";
import { formatCurrency } from "../../lib/formatters";
import { getTransferWiseStatusAppearance } from "../../lib/status-helpers";
import type { TransferWiseStatus } from "../../lib/constants";
import { TransferDetail } from "./TransferDetail";

interface TransferHistoryListProps {
  transfers: TransferWiseTransfer[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function TransferHistoryList({ transfers, isLoading, onRefresh }: TransferHistoryListProps) {
  const { push } = useNavigation();

  return (
    <List isLoading={isLoading} navigationTitle="Transfer History">
      {!isLoading && transfers.length === 0 && (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Transfers"
          description="You haven't made any international transfers yet"
        />
      )}
      {transfers.map((transfer) => {
        const statusAppearance = getTransferWiseStatusAppearance((transfer.status || "PENDING") as TransferWiseStatus);
        const sourceAmount = transfer.amount_source
          ? formatCurrency(transfer.amount_source.value, transfer.amount_source.currency)
          : "N/A";
        const targetAmount = transfer.amount_target
          ? formatCurrency(transfer.amount_target.value, transfer.amount_target.currency)
          : "N/A";

        return (
          <List.Item
            key={transfer.id}
            title={`${sourceAmount} → ${targetAmount}`}
            subtitle={transfer.reference || ""}
            icon={{ source: statusAppearance.icon, tintColor: statusAppearance.color }}
            accessories={[
              { tag: { value: statusAppearance.label, color: statusAppearance.color } },
              ...(transfer.created ? [{ date: new Date(transfer.created), tooltip: "Transfer date" }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Details"
                  icon={Icon.Eye}
                  onAction={() => push(<TransferDetail transfer={transfer} />)}
                />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
