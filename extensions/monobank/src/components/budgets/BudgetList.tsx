import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { ReactNode, useMemo, useState } from "react";
import { budgetPresets } from "../../data/budgetPresets";
import { shortcuts } from "../../data/shortcuts";
import { AccountStatementGroup, useBudgets } from "../../hooks";
import { Account, Budget, Transaction } from "../../types";
import {
  BudgetMonth,
  BudgetProgress,
  formatBudgetAccounts,
  formatBudgetPercentage,
  formatHryvnias,
  formatSpentOfLimit,
  formatSyncTime,
  getBudgetColor,
  getBudgetIcon,
  getBudgetProgress,
  getCategoryOptions,
  getStatementItemTitle,
  isSavings,
  isSyncedToday,
} from "../../utils";
import BudgetForm from "./BudgetForm";

const { Metadata } = List.Item.Detail;

/**
 * The saved budgets, with each one's progress across the budget accounts when `month` is set. Used by
 * "Manage Budgets…" in "Show Statement" and by the "Show Budgets" command.
 */
export default function BudgetList(props: {
  /** The accounts budgets count. */
  accounts: Account[];
  /** Every loaded transaction of the month per budget account, not only the ones a search matched. */
  groups: AccountStatementGroup[];
  month?: BudgetMonth;
  isLoading?: boolean;
  /** Whether the month has older transactions that aren't loaded. */
  isPartial?: boolean;
  /** Unix milliseconds of the least recent sync among the budget accounts. */
  oldestSyncedAt?: number;
  /** Shown in the section subtitle instead of the usual note, e.g. a token problem. */
  note?: string;
  /** Extra actions on every item, e.g. switching the month. */
  actions?: ReactNode;
  /** Only for a pushed view: the command's own title shows at the root. */
  navigationTitle?: string;
}) {
  const {
    accounts,
    groups,
    month,
    isLoading = false,
    isPartial,
    oldestSyncedAt,
    note,
    actions,
    navigationTitle,
  } = props;
  const { budgets, isLoading: isLoadingBudgets, remove, move } = useBudgets();
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const hasAccounts = accounts.length > 0;
  const progress = useMemo(
    () =>
      hasAccounts && month
        ? getBudgetProgress(
            budgets,
            groups.map((group) => ({ accountId: group.account.id, transactions: group.transactions })),
            month,
          )
        : undefined,
    [hasAccounts, month, budgets, groups],
  );
  const spentCategories = useMemo(() => getSpentCategories(groups.flatMap((group) => group.transactions)), [groups]);

  function getNote() {
    if (note) return note;
    if (!hasAccounts && !isLoading) return "No UAH cards selected";
    if (!month) return "Progress shows for This Month and Last Month";
    if (isPartial) return "Partial: older transactions not loaded";
    if (!isLoading && oldestSyncedAt !== undefined && !isSyncedToday(oldestSyncedAt)) {
      return "Some cards not updated today";
    }
    return undefined;
  }

  const sectionTitle = [month?.label, hasAccounts && formatBudgetAccounts(accounts)].filter(Boolean).join(" · ");

  async function confirmDelete(budget: Budget) {
    const isConfirmed = await confirmAlert({
      title: `Delete "${budget.name}"?`,
      message: "This budget will be deleted.",
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!isConfirmed) return;

    await remove(budget);
    await showToast(Toast.Style.Success, "Budget Deleted", budget.name);
  }

  const formProps = { spentCategories };
  // `isFirst`: in the empty view, "Create Budget" takes ⏎ instead of its shortcut.
  const renderCreateActions = (isFirst: boolean) => (
    <>
      <Action.Push
        title="Create Budget"
        icon={Icon.Plus}
        shortcut={isFirst ? undefined : shortcuts.create}
        target={<BudgetForm {...formProps} />}
      />
      <PresetSubmenu budgets={budgets} spentCategories={spentCategories} />
    </>
  );

  return (
    <List
      // Raycast hides the empty view while loading, so a statement sync (minutes with the rate limit) would hide
      // "Create Budget" when there are no budgets yet. Its toast still shows the progress.
      isLoading={isLoadingBudgets || (budgets.length > 0 && isLoading)}
      isShowingDetail={isShowingDetail && budgets.length > 0}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search budgets"
    >
      {!isLoadingBudgets && (
        <List.EmptyView
          icon={Icon.Coins}
          title="No Budgets"
          description="Set a monthly limit for spending categories, e.g. 5 000 ₴ for cafes."
          actions={
            <ActionPanel>
              {renderCreateActions(true)}
              {actions}
            </ActionPanel>
          }
        />
      )}

      <List.Section title={sectionTitle || "Budgets"} subtitle={getNote()}>
        {budgets.map((budget, index) => {
          const item = progress?.[index];
          return (
            <List.Item
              key={budget.id}
              icon={item ? getBudgetIcon(item) : { source: Icon.Coins, tintColor: Color.SecondaryText }}
              title={budget.name}
              subtitle={isShowingDetail ? undefined : formatCategories(budget.categories)}
              keywords={budget.categories}
              accessories={getAccessories(budget, item)}
              detail={<BudgetDetail budget={budget} progress={item} month={month} groups={groups} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Edit Budget"
                      icon={Icon.Pencil}
                      target={<BudgetForm budget={budget} {...formProps} />}
                    />
                    <Action
                      title="Toggle Details"
                      icon={Icon.Sidebar}
                      onAction={() => setIsShowingDetail((value) => !value)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>{renderCreateActions(false)}</ActionPanel.Section>
                  <ActionPanel.Section>
                    {index > 0 && (
                      <Action
                        title="Move up"
                        icon={Icon.ArrowUp}
                        shortcut={shortcuts.moveUp}
                        onAction={() => move(budget, "up")}
                      />
                    )}
                    {index < budgets.length - 1 && (
                      <Action
                        title="Move Down"
                        icon={Icon.ArrowDown}
                        shortcut={shortcuts.moveDown}
                        onAction={() => move(budget, "down")}
                      />
                    )}
                    <Action
                      title="Delete Budget"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={shortcuts.remove}
                      onAction={() => confirmDelete(budget)}
                    />
                  </ActionPanel.Section>
                  {actions && <ActionPanel.Section>{actions}</ActionPanel.Section>}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

/** Presets that aren't added yet, each opening the form filled in with it. */
function PresetSubmenu(props: { budgets: Budget[]; spentCategories: string[] }) {
  const { budgets, spentCategories } = props;
  const names = new Set(budgets.map((budget) => budget.name.toLowerCase()));
  const presets = budgetPresets.filter((preset) => !names.has(preset.name.toLowerCase()));
  if (!presets.length) return null;

  return (
    <ActionPanel.Submenu title="Create from Preset" icon={Icon.Wand}>
      {presets.map((preset) => (
        <Action.Push
          key={preset.name}
          title={preset.name}
          target={<BudgetForm preset={preset} spentCategories={spentCategories} />}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function BudgetDetail(props: {
  budget: Budget;
  progress?: BudgetProgress;
  month?: BudgetMonth;
  groups: AccountStatementGroup[];
}) {
  const { budget, progress, month, groups } = props;
  const options = getCategoryOptions();
  const color = progress && getBudgetColor(progress.status);

  return (
    <List.Item.Detail
      metadata={
        // Keys include the text, so Raycast recreates a label whose text changed instead of truncating it.
        <Metadata>
          <Metadata.Label key={`limit:${budget.limit}`} title="Monthly Limit" text={formatHryvnias(budget.limit)} />
          {progress && month && (
            <>
              <Metadata.Label key={`month:${month.label}`} title="Month" text={month.label} />
              <Metadata.Label
                key={`spent:${progress.spent}`}
                title="Spent"
                text={{ value: `${formatHryvnias(progress.spent)} · ${formatBudgetPercentage(progress)}`, color }}
              />
              <Metadata.Label
                key={`left:${progress.left}`}
                title={progress.left < 0 ? "Over by" : "Left"}
                text={{ value: formatHryvnias(Math.abs(progress.left)), color: progress.left < 0 ? color : undefined }}
              />
              {progress.perDayLeft !== undefined && (
                <Metadata.Label
                  key={`perDay:${progress.perDayLeft}:${progress.daysLeft}`}
                  title="Per Day"
                  text={`≈ ${formatHryvnias(progress.perDayLeft)} for ${progress.daysLeft} ${progress.daysLeft === 1 ? "day" : "days"}`}
                />
              )}
              {progress.projected !== undefined && (
                <Metadata.Label
                  key={`projected:${progress.projected}`}
                  title="At This Pace"
                  text={{
                    value: formatHryvnias(progress.projected),
                    color: progress.projected > budget.limit ? Color.Orange : undefined,
                  }}
                />
              )}
            </>
          )}
          <Metadata.Separator />
          <Metadata.Label title="Categories" />
          {budget.categories.map((name) => {
            const option = options.find((option) => option.name === name);
            const spent = progress?.categories.find((category) => category.name === name)?.spent;
            const text = spent !== undefined ? formatHryvnias(spent) : (option?.nameUk ?? "");
            return (
              <Metadata.Label
                key={`${name}:${text}`}
                title={name}
                icon={option ? option.icon : { source: Icon.Warning, tintColor: Color.Orange }}
                text={option ? text : "Unknown category"}
              />
            );
          })}
          {progress && groups.length > 0 && (
            <>
              <Metadata.Separator />
              <Metadata.Label title="Accounts" />
              {groups.map(({ account, syncedAt }) => {
                const spent = progress.byAccount.find((item) => item.accountId === account.id)?.spent ?? 0;
                const text = `${formatHryvnias(spent)} · ${formatSyncTime(syncedAt)}`;
                return (
                  <Metadata.Label
                    key={`account:${account.id}:${text}`}
                    title={getStatementItemTitle(account)}
                    icon={Icon.CreditCard}
                    text={text}
                  />
                );
              })}
            </>
          )}
        </Metadata>
      }
    />
  );
}

function getAccessories(budget: Budget, progress?: BudgetProgress): List.Item.Accessory[] {
  if (!progress) return [{ text: formatHryvnias(budget.limit), tooltip: "Monthly limit" }];

  const color = getBudgetColor(progress.status);
  const left =
    progress.left < 0 ? `Over by ${formatHryvnias(-progress.left)}` : `${formatHryvnias(progress.left)} left`;
  return [
    { text: { value: formatSpentOfLimit(progress), color }, tooltip: left },
    { text: { value: formatBudgetPercentage(progress), color } },
  ];
}

/** E.g. "Cafe. Restaurants, Bars, Fast Food", or the first three and "+2". */
function formatCategories(categories: string[]) {
  const shown = categories.slice(0, 3).join(", ");
  return categories.length > 3 ? `${shown} +${categories.length - 3}` : shown;
}

/** Categories with spending in `transactions`, the most spent first. */
function getSpentCategories(transactions: Transaction[]) {
  const spent = new Map<string, number>();
  for (const transaction of transactions) {
    // Savings can't be budgeted, so they aren't suggested.
    if (transaction.amount >= 0 || isSavings(transaction)) continue;
    const { name } = transaction.category;
    spent.set(name, (spent.get(name) ?? 0) - transaction.amount);
  }
  return [...spent.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}
