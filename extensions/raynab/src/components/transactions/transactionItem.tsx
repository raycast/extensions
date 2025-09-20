import { Icon, List, ActionPanel, Color, Action } from '@raycast/api';

import { TransactionDetail } from '@srcTypes';
import { TransactionClearedStatus } from 'ynab';
import { useTransaction } from './transactionContext';
import { easyGetColorFromId, formatToReadableAmount, getFlagColor, time } from '@lib/utils';

import {
  OpenInYnabAction,
  GroupBySubmenu,
  SortBySubmenu,
  TimelineSubmenu,
  ToggleFlagsAction,
} from '@components/actions';
import { TransactionEditForm } from './transactionEditForm';
import { FilterBySubmenu } from '@components/actions/filterSubmenu';
import { ToggleDetailsAction } from '@components/actions/toggleDetailsAction';
import { ApproveTransactionAction } from '@components/actions/approveTransactionAction';
import { TransactionCreateForm } from './transactionCreateForm';
import { Shortcuts } from '@constants';
import { DeleteTransactionAction } from '@components/actions/deleteTransactionAction';

const INFLOW_ICON = { source: Icon.PlusCircle, tintColor: Color.Green };
const OUTFLOW_ICON = { source: Icon.MinusCircle, tintColor: Color.Red };

export function TransactionItem({
  transaction,
  onTransactionDeleted,
}: {
  transaction: TransactionDetail;
  onTransactionDeleted: () => void;
}) {
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

  const hasSubtransactions = transaction.subtransactions.length > 0;

  const mainIcon = transaction.amount > 0 ? INFLOW_ICON : OUTFLOW_ICON;
  const hasCleared = transaction.cleared === TransactionClearedStatus.Cleared;
  const isReconciled = transaction.cleared === TransactionClearedStatus.Reconciled;

  return (
    <List.Item
      icon={mainIcon}
      id={transaction.id}
      title={transaction.payee_name ?? transaction.id}
      subtitle={formatToReadableAmount({ amount: transaction.amount, currency })}
      accessories={
        /* Accessories should be absent when showing details @see https://developers.raycast.com/api-reference/user-interface/list#list.item.detail */
        !state.isShowingDetails
          ? [
              !transaction.approved
                ? { icon: { source: Icon.MagnifyingGlass, tintColor: Color.Orange }, tooltip: 'Unreviewed' }
                : {},
              isReconciled ? { icon: { source: Icon.Lock, tintColor: Color.Green }, tooltip: 'Reconciled' } : {},
              transaction.transfer_account_id ? { icon: Icon.Switch, tooltip: 'Transfer' } : {},
              transaction.subtransactions.length > 0 ? { icon: Icon.Coins, tooltip: 'Split Transaction' } : {},
              {
                icon: showFlags ? { source: Icon.Flag, tintColor: getFlagColor(transaction.flag_color) } : undefined,
              },
              {
                text: time(transaction.date).calendar(),
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
                text={formatToReadableAmount({ amount: transaction.amount, currency })}
              />
              <List.Item.Detail.Metadata.Label title="Date" text={time(transaction.date).format('LL')} />
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
                        color={
                          transaction.category_name
                            ? transaction.category_name === 'Uncategorized'
                              ? null
                              : easyGetColorFromId(idx)
                            : Color.Red
                        }
                      />
                    ))
                ) : (
                  <List.Item.Detail.Metadata.TagList.Item
                    text={transaction.category_name ?? 'Not Specified'}
                    color={
                      transaction.category_name
                        ? transaction.category_name === 'Uncategorized'
                          ? null
                          : Color.Green
                        : Color.Red
                    }
                  />
                )}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Status"
                text={hasCleared ? 'Cleared' : isReconciled ? 'Reconciled' : 'Uncleared'}
                icon={
                  hasCleared
                    ? { source: Icon.CircleProgress100, tintColor: Color.Green }
                    : isReconciled
                      ? { source: Icon.Lock, tintColor: Color.Green }
                      : Icon.Circle
                }
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
          <ActionPanel.Section title="Update Transaction">
            <DeleteTransactionAction transaction={transaction} onTransactionDeleted={onTransactionDeleted} />
            {transaction.approved ? '' : <ApproveTransactionAction transaction={transaction} />}
          </ActionPanel.Section>
          <ActionPanel.Section title="Change List View">
            <GroupBySubmenu onGroup={onGroup} currentGroup={state.group} />
            <SortBySubmenu onSort={onSort} currentSort={state.sort} />
            <TimelineSubmenu onTimelineChange={onTimelineChange} currentTimeline={state.timeline ?? 'month'} />
            <FilterBySubmenu onFilter={onFilter} currentFilter={state.filter} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Other">
            <Action.Push
              title="Create New Transaction"
              icon={Icon.Plus}
              target={<TransactionCreateForm categoryId={transaction.category_id ?? undefined} />}
              shortcut={Shortcuts.CreateNewTransaction}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
