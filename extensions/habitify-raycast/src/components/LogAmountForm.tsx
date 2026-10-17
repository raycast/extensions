import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { formatUTCDate } from "../lib/date";
import { isHabitifyError, logHabitValue, TodayHabit } from "../lib/habitify";

type Props = {
  habit: TodayHabit;
  apiKey: string;
  onSuccess: () => void;
};

export default function LogAmountForm({ habit, apiKey, onSuccess }: Props) {
  const { pop } = useNavigation();
  const unit = habit.progress?.unit?.trim() ?? "";

  const handleSubmit = async (values: { value: string }) => {
    const num = parseFloat(values.value);
    if (isNaN(num) || num < 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid amount",
        message: "Enter a positive number.",
      });
      return;
    }
    const targetDate = formatUTCDate(new Date());
    const toastPromise = showToast({
      style: Toast.Style.Animated,
      title: "Logging amount…",
    });
    try {
      await logHabitValue(apiKey, habit.id, num, unit, targetDate);
      const toast = await toastPromise;
      toast.style = Toast.Style.Success;
      toast.title = "Amount logged";
      toast.message = `${num}${unit ? ` ${unit}` : ""} for ${habit.name}`;
      onSuccess();
      pop();
    } catch (err) {
      const toast = await toastPromise;
      toast.style = Toast.Style.Failure;
      toast.title = "Could not log amount";
      toast.message = isHabitifyError(err)
        ? `${err.status}: ${err.message}`
        : err instanceof Error
          ? err.message
          : "Unknown error";
    }
  };

  return (
    <Form
      navigationTitle={`Log ${habit.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Amount" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="value"
        title={`Amount${unit ? ` (${unit})` : ""}`}
        placeholder={habit.progress ? String(habit.progress.current) : "0"}
        autoFocus
      />
      {habit.progress && (
        <Form.Description
          title="Goal"
          text={`${habit.progress.current} / ${habit.progress.target}${unit ? ` ${unit}` : ""}`}
        />
      )}
    </Form>
  );
}
