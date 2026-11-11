import { Action, ActionPanel, Icon } from "@raycast/api";
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

/** Actions for the whole statement, shown on every item. */
export default function StatementActionsSection(props: StatementActionsProps) {
  const { period, onChangePeriod, onExportCsv, onCopyCsv, onRefresh, onToggleDetails, budgets } = props;

  return (
    <ActionPanel.Section>
      <Action.Push
        title="Change Period…"
        icon={Icon.Calendar}
        shortcut={shortcuts.changePeriod}
        target={<PeriodForm period={period} onChange={onChangePeriod} />}
      />
      {onExportCsv && (
        <Action title="Export to CSV" icon={Icon.Download} shortcut={shortcuts.exportCsv} onAction={onExportCsv} />
      )}
      {onCopyCsv && <Action title="Copy as CSV" icon={Icon.CopyClipboard} onAction={onCopyCsv} />}
      <Action.Push
        title="Manage Budgets…"
        icon={Icon.Coins}
        shortcut={shortcuts.manageBudgets}
        target={<BudgetsView initialMonth={budgets.initialMonth} />}
      />
      <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={shortcuts.refresh} onAction={onRefresh} />
      <Action
        title="Toggle Details"
        icon={Icon.Sidebar}
        shortcut={shortcuts.toggleDetails}
        onAction={onToggleDetails}
      />
    </ActionPanel.Section>
  );
}
