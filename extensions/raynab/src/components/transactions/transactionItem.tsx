import { Icon, List, ActionPanel, Color, Action } from '@raycast/api';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

import { type TransactionDetail } from 'ynab';
import { TransactionDetails } from './transactionDetails';
import { useTransaction } from './transactionContext';
import { formatToReadablePrice, getFlagColor } from '@lib/utils';
import {
  OpenInYnabAction,
  GroupBySubmenu,
  SortBySubmenu,
  TimelineSubmenu,
  ToggleFlagsAction,
} from '@components/actions';
import { TransactionEditForm } from './transactionEditForm';
import { FilterBySubmenu } from '@components/actions/filterSubmenu';

const INFLOW_ICON = { source: Icon.ChevronUp, tintColor: Color.Green };
const OUTFLOW_ICON = { source: Icon.ChevronDown, tintColor: Color.Red };

export function TransactionItem({ transaction }: { transaction: TransactionDetail }) {
  const {
    onGroup,
    onSort,
    onFilter,
    onTimelineChange,
    state,
    flags: [showFlags, setShowFlags],
    currency,
  } = useTransaction();

  const mainIcon = transaction.amount > 0 ? INFLOW_ICON : OUTFLOW_ICON;

  return (
    <List.Item
      icon={mainIcon}
      id={transaction.id}
      title={transaction.payee_name ?? transaction.id}
      subtitle={formatToReadablePrice({ amount: transaction.amount, currency })}
      accessories={[
        transaction.transfer_account_id ? { icon: Icon.Switch, tooltip: 'Transfer' } : {},
        {
          icon: showFlags ? { source: Icon.Flag, tintColor: getFlagColor(transaction.flag_color) } : undefined
        },
        {
          text: dayjs(transaction.date).fromNow()
        }
      ]}
      actions={
        <ActionPanel title="Inspect Transaction">
          <ActionPanel.Section>
            <Action.Push
              title="Show Transaction"
              icon={Icon.Eye}
              target={<TransactionDetails transaction={transaction} />}
            />
            <Action.Push
              title="Edit Transaction"
              icon={Icon.Pencil}
              target={<TransactionEditForm transaction={transaction} />}
            />
            <OpenInYnabAction accounts accountId={transaction.account_id} />
            <ToggleFlagsAction showFlags={showFlags} setShowFlags={setShowFlags} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Modify List View">
            <GroupBySubmenu onGroup={onGroup} currentGroup={state.group} />
            <SortBySubmenu onSort={onSort} currentSort={state.sort} />
            <TimelineSubmenu onTimelineChange={onTimelineChange} currentTimeline={state.timeline ?? 'month'} />
            <FilterBySubmenu onFilter={onFilter} currentFilter={state.filter} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
