import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { shortcuts } from "../../data/shortcuts";
import { Period } from "../../types";
import BudgetsView, { BudgetPeriod } from "../budgets/BudgetsView";
import PeriodForm from "./PeriodForm";

export interface StatementActionsProps {
  period: Period;
  onChangePeriod: (period: Period) => void;
  /** Left out when there is nothing to export. */
  onExportCsv?: () => void;
  onCopyCsv?: () => void;
  onRefresh: () => void;
  onToggleDetails: () => void;
  /** The month "Manage Budgets…" opens on. */
  budgets: { initialMonth: BudgetPeriod };
}

/**
 * Actions for the whole statement, shown on every item. `actionsBefore` is how many actions come before it in the
 * panel: the first two take ⏎ and ⌘⏎, so they don't get their own shortcuts.
 */
export default function StatementActionsSection(props: StatementActionsProps & { actionsBefore?: number }) {
  const { period, onChangePeriod, onExportCsv, onCopyCsv, onRefresh, onToggleDetails, budgets } = props;
  const actionsBefore = props.actionsBefore ?? 2;
  // The actions in the order they're shown, to find the first two.
  const order = ["period", onExportCsv && "export", onCopyCsv && "copy", "budgets", "refresh", "details"].filter(
    Boolean,
  );
  const getShortcut = (action: string, shortcut: Keyboard.Shortcut) =>
    actionsBefore + order.indexOf(action) >= 2 ? shortcut : undefined;

  return (
    <ActionPanel.Section>
      <Action.Push
        title="Change Period…"
        icon={Icon.Calendar}
        shortcut={getShortcut("period", shortcuts.changePeriod)}
        target={<PeriodForm period={period} onChange={onChangePeriod} />}
      />
      {onExportCsv && (
        <Action
          title="Export to CSV"
          icon={Icon.Download}
          shortcut={getShortcut("export", shortcuts.exportCsv)}
          onAction={onExportCsv}
        />
      )}
      {onCopyCsv && <Action title="Copy as CSV" icon={Icon.CopyClipboard} onAction={onCopyCsv} />}
      <Action.Push
        title="Manage Budgets…"
        icon={Icon.Coins}
        shortcut={getShortcut("budgets", shortcuts.manageBudgets)}
        target={<BudgetsView initialMonth={budgets.initialMonth} navigationTitle="Budgets" />}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={getShortcut("refresh", shortcuts.refresh)}
        onAction={onRefresh}
      />
      <Action
        title="Toggle Details"
        icon={Icon.Sidebar}
        shortcut={getShortcut("details", shortcuts.toggleDetails)}
        onAction={onToggleDetails}
      />
    </ActionPanel.Section>
  );
}
