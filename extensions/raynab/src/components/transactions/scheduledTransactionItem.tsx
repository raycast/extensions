import { Icon, List, ActionPanel, Color, Action } from '@raycast/api';

import { ScheduledTransactionDetail } from '@srcTypes';
import { useTransaction } from './transactionContext';
import { easyGetColorFromId, formatToReadableFrequency, formatToReadableAmount, getFlagColor, time } from '@lib/utils';

import { OpenInYnabAction, ToggleFlagsAction } from '@components/actions';
import { ToggleDetailsAction } from '@components/actions/toggleDetailsAction';
import { TransactionCreateForm } from './transactionCreateForm';
import { Shortcuts } from '@constants';
import { useCategoryGroups } from '@hooks/useCategoryGroups';
import { useLocalStorage } from '@raycast/utils';

const INFLOW_ICON = { source: Icon.PlusCircle, tintColor: Color.Green };
const OUTFLOW_ICON = { source: Icon.MinusCircle, tintColor: Color.Red };

export function ScheduledTransactionItem({ transaction }: { transaction: ScheduledTransactionDetail }) {
  const {
    toggleDetails,
    currency,
    state,
    flags: [showFlags, setShowFlags],
  } = useTransaction();

  const hasSubtransactions = transaction.subtransactions.length > 0;

  const mainIcon = transaction.amount > 0 ? INFLOW_ICON : OUTFLOW_ICON;

  const { value: activeBudgetId } = useLocalStorage('activeBudgetId', '');
  const { data: categoryGroups } = useCategoryGroups(activeBudgetId);
  const categories = categoryGroups?.flatMap((group) => group.categories);

  const frequency = formatToReadableFrequency(transaction.frequency);

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
              { icon: Icon.Repeat, tooltip: frequency },
              transaction.transfer_account_id ? { icon: Icon.Switch, tooltip: 'Transfer' } : {},
              transaction.subtransactions.length > 0 ? { icon: Icon.Coins, tooltip: 'Split Transaction' } : {},
              {
                icon: showFlags ? { source: Icon.Flag, tintColor: getFlagColor(transaction.flag_color) } : undefined,
              },
              {
                text: time(transaction.date_next).fromNow(),
                tooltip: transaction.date_next,
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
              <List.Item.Detail.Metadata.Label title="Frequency" text={frequency} />
              <List.Item.Detail.Metadata.Label title="Next Date" text={time(transaction.date_next).format('LL')} />
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
                    .map((transaction, idx) => {
                      const { name: categoryName } = categories?.find((c) => c.id === transaction.category_id) ?? {};

                      return (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={transaction.id}
                          text={categoryName ?? 'Not Specified'}
                          color={
                            categoryName
                              ? categoryName === 'Uncategorized'
                                ? null
                                : easyGetColorFromId(idx)
                              : Color.Red
                          }
                        />
                      );
                    })
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
                title="First Occurence"
                text={time(transaction.date_first).format('LL')}
              />
              <List.Item.Detail.Metadata.Label
                title="Flag"
                icon={
                  transaction.flag_color
                    ? { source: Icon.Tag, tintColor: getFlagColor(transaction.flag_color) }
                    : Icon.Minus
                }
              />
              <List.Item.Detail.Metadata.Label title="Memo" text={transaction.memo ?? ''} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel title="Inspect Transaction">
          <ActionPanel.Section>
            <ToggleDetailsAction showDetails={state.isShowingDetails} toggleDetails={toggleDetails} />
            <OpenInYnabAction accounts accountId={transaction.account_id} />
            <ToggleFlagsAction showFlags={showFlags} setShowFlags={setShowFlags} />
          </ActionPanel.Section>
          <Action.Push
            title="Create New Transaction"
            icon={Icon.Plus}
            target={<TransactionCreateForm categoryId={transaction.category_id ?? undefined} />}
            shortcut={Shortcuts.CreateNewTransaction}
          />
        </ActionPanel>
      }
    />
  );
}
