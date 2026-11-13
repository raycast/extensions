import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { putKpiScore } from "../api/ninety";
import { ScorecardKpi } from "../api/types";
import { showError } from "../lib/errors";
import { formatGoal, formatKpiValue, numericValue } from "../lib/format";

interface Values {
  period: string;
  value: string;
}

interface Props {
  kpi: ScorecardKpi;
  /** Period to preselect (its start date); defaults to the latest one. */
  periodStartDate?: string;
  onSaved?: () => void;
}

export function ScoreForm({ kpi, periodStartDate, onSaved }: Props) {
  const { pop } = useNavigation();
  const periods = kpi.scores.filter((score) => !score.isFuture);
  const latest = periods.find((score) => score.periodStartDate === periodStartDate) ?? periods[periods.length - 1];
  const isYesNo = kpi.unit === "yesno";

  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: {
      period: latest?.periodStartDate ?? "",
      value:
        latest && numericValue(latest.value) !== undefined ? String(numericValue(latest.value)) : isYesNo ? "1" : "",
    },
    validation: {
      period: (value) => (value ? undefined : "Pick a period"),
      value: (value) => (value && !isNaN(Number(value)) ? undefined : "Enter a number"),
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Saving score…" });
      try {
        await putKpiScore(kpi.id, Number(values.value), values.period);
        toast.style = Toast.Style.Success;
        toast.title = "Score saved";
        onSaved?.();
        pop();
      } catch (error) {
        toast.hide();
        await showError(error, "Couldn't save score");
      }
    },
  });

  return (
    <Form
      navigationTitle="Input Score"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Score" icon={Icon.Checkmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Measurable" text={kpi.title} />
      <Form.Description title="Goal" text={formatGoal(kpi.defaultGoal, kpi.unit)} />
      <Form.Dropdown title="Period" {...itemProps.period}>
        {[...periods].reverse().map((score) => (
          <Form.Dropdown.Item
            key={score.periodStartDate}
            title={`${score.label}${score.value !== null && score.value !== undefined ? ` (${formatKpiValue(score.value, kpi.unit)})` : ""}`}
            value={score.periodStartDate}
          />
        ))}
      </Form.Dropdown>
      {isYesNo ? (
        <Form.Dropdown title="Score" {...itemProps.value}>
          <Form.Dropdown.Item title="Yes" value="1" />
          <Form.Dropdown.Item title="No" value="0" />
        </Form.Dropdown>
      ) : (
        <Form.TextField title="Score" placeholder="Number" {...itemProps.value} />
      )}
    </Form>
  );
}
