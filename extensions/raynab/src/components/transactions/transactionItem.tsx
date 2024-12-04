import { Icon, List, ActionPanel, Color, Action } from '@raycast/api';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

import { TransactionDetail } from '@srcTypes';
import { TransactionClearedStatus } from 'ynab';
import { useTransaction } from './transactionContext';
import { easyGetColorFromId, formatToReadablePrice, getFlagColor } from '@lib/utils';

import {
  OpenInYnabAction,
  GroupBySubmenu,
  SortBySubmenu,
  TimelineSubmenu,
  ToggleFlagsAction,
} from '@components/actions';
import { TransactionEditForm } from './transactionEditForm';
import { FilterBySubmenu } from '@components/actions/filterSubmenu';
import { useLocalStorage } from '@hooks/useLocalStorage';
import { CurrencyFormat } from '@srcTypes';
import { ToggleDetailsAction } from '@components/actions/toggleTransactionDetailsAction';

const INFLOW_ICON = { source: Icon.PlusCircle, tintColor: Color.Green };
const OUTFLOW_ICON = { source: Icon.MinusCircle, tintColor: Color.Red };

export function TransactionItem({ transaction }: { transaction: TransactionDetail }) {
  const {
    onGroup,
    onSort,
    onFilter,
    onTimelineChange,
    toggleDetails,
    state,
    flags: [showFlags, setShowFlags],
    currency,
  } = useTransaction();

  const [activeBudgetCurrency] = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);
  const hasSubtransactions = transaction.subtransactions.length > 0;

  const mainIcon = transaction.amount > 0 ? INFLOW_ICON : OUTFLOW_ICON;
  const hasCleared = transaction.cleared === TransactionClearedStatus.Cleared;

  return (
    <List.Item
      icon={mainIcon}
      id={transaction.id}
      title={transaction.payee_name ?? transaction.id}
      subtitle={formatToReadablePrice({ amount: transaction.amount, currency })}
      accessories={
        !state.isShowingDetails
          ? [
              transaction.transfer_account_id ? { icon: Icon.Switch, tooltip: 'Transfer' } : {},
              transaction.subtransactions.length > 0 ? { icon: Icon.Coins, tooltip: 'Split Transaction' } : {},
              {
                icon: showFlags ? { source: Icon.Flag, tintColor: getFlagColor(transaction.flag_color) } : undefined,
              },
              {
                text: dayjs(transaction.date).fromNow(),
                tooltip: transaction.date,
              },
            ]
          : []
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Account" text={transaction.account_name} />
              <List.Item.Detail.Metadata.Label
                title="Amount"
                text={formatToReadablePrice({ amount: transaction.amount, currency: activeBudgetCurrency })}
              />
              <List.Item.Detail.Metadata.Label title="Date" text={dayjs(transaction.date).format('LL')} />
              <List.Item.Detail.Metadata.TagList title={hasSubtransactions ? 'Categories' : 'Category'}>
                {hasSubtransactions ? (
                  [...transaction.subtransactions]
                    .sort((a, b) => {
                      /* 
                    This might look a bit odd
                    But we're showing the highest income if the main
                    transaction is an inflow
                    And the highest spend if it is an outflow
                  */
                      if (transaction.amount > 0) {
                        return b.amount - a.amount;
                      } else {
                        return a.amount - b.amount;
                      }
                    })
                    .map((transaction, idx) => (
                      <List.Item.Detail.Metadata.TagList.Item
                        key={transaction.id}
                        text={transaction.category_name ?? 'Not Specified'}
                        color={transaction.category_name ? easyGetColorFromId(idx) : Color.Red}
                      />
                    ))
                ) : (
                  <List.Item.Detail.Metadata.TagList.Item
                    text={transaction.category_name ?? 'Not Specified'}
                    color={transaction.category_name ? Color.Green : Color.Red}
                  />
                )}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Status"
                text={hasCleared ? 'Cleared' : 'Uncleared'}
                icon={hasCleared ? { source: Icon.CircleProgress100, tintColor: Color.Green } : Icon.Circle}
              />
              <List.Item.Detail.Metadata.Label
                title="Flag"
                icon={
                  transaction.flag_color
                    ? { source: Icon.Tag, tintColor: getFlagColor(transaction.flag_color) }
                    : Icon.Minus
                }
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Memo" text={transaction.memo ?? ''} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel title="Inspect Transaction">
          <ActionPanel.Section>
            <ToggleDetailsAction showDetails={state.isShowingDetails} toggleDetails={toggleDetails} />
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
