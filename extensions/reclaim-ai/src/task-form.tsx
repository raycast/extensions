import { Action, ActionPanel, Clipboard, Form, Toast, popToRoot, showHUD, showToast } from "@raycast/api";
import { addDays, addMinutes } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useTask } from "./hooks/useTask";
import { useTimePolicy } from "./hooks/useTimePolicy";
import { useUser } from "./hooks/useUser";
import { TimePolicy } from "./types/time-policy";
import { TIME_BLOCK_IN_MINUTES, formatDuration, parseDurationToMinutes } from "./utils/dates";
import { TaskPlanDetails } from "./types/plan";

interface FormValues {
  title: string;
  timeNeeded: string;
  durationMin: string;
  durationMax: string;
  snoozeUntil: Date;
  timePolicy: string;
  due: Date;
  notes: string;
  priority: string;
  onDeck: boolean;
}

interface Props {
  timeNeeded?: string;
  title?: string;
  interpreter?: Partial<TaskPlanDetails>;
  loading?: boolean;
}

export default (props: Props) => {
  const { timeNeeded: userTimeNeeded, title: userTitle, interpreter } = props;

  const { currentUser } = useUser();
  const { createTask } = useTask();
  const { isLoading: isLoadingTimePolicy, getTimePolicy } = useTimePolicy();

  const defaults = useMemo(
    () => ({
      defaultDueDate: addDays(new Date(), currentUser?.features.taskSettings.defaults.dueInDays || 0),
      defaultSnoozeDate: addMinutes(new Date(), currentUser?.features.taskSettings.defaults.delayedStartInMinutes || 0),
      minDuration: (currentUser?.features.taskSettings.defaults.minChunkSize || 1) * TIME_BLOCK_IN_MINUTES,
      maxDuration: (currentUser?.features.taskSettings.defaults.maxChunkSize || 1) * TIME_BLOCK_IN_MINUTES,
      duration: (currentUser?.features.taskSettings.defaults.timeChunksRequired || 1) * TIME_BLOCK_IN_MINUTES,
      schedulerVersion: currentUser?.features.scheduler || 14,
    }),
    [currentUser]
  );

  const [timeNeeded, setTimeNeeded] = useState(
    formatDuration(
      `${userTimeNeeded || (interpreter?.durationTimeChunks || 0) * TIME_BLOCK_IN_MINUTES || defaults.duration}m`
    )
  );
  const [durationMax, setDurationMax] = useState(
    formatDuration(`${(interpreter?.durationTimeChunks || 0) * TIME_BLOCK_IN_MINUTES || defaults.maxDuration}m`)
  );
  const [durationMin, setDurationMin] = useState(
    formatDuration(`${(interpreter?.durationTimeChunks || 0) * TIME_BLOCK_IN_MINUTES || defaults.minDuration}m`)
  );

  const [timeNeededError, setTimeNeededError] = useState<string | undefined>();
  const [durationMinError, setDurationMinError] = useState<string | undefined>();
  const [durationMaxError, setDurationMaxError] = useState<string | undefined>();
  const [timePolicies, setTimePolicies] = useState<TimePolicy[] | undefined>();
  const [timePolicy, setTimePolicy] = useState<string>("");

  const [due, setDue] = useState<Date | null>(interpreter?.due ? new Date(interpreter.due) : defaults.defaultDueDate);
  const [snooze, setSnooze] = useState<Date | null>(
    interpreter?.snoozeUntil ? new Date(interpreter.snoozeUntil) : defaults.defaultSnoozeDate
  );

  const handleSubmit = async (formValues: FormValues) => {
    await showToast(Toast.Style.Animated, "Creating Task...");
    const { timeNeeded, durationMin, durationMax, snoozeUntil, due, notes, title, timePolicy, priority, onDeck } =
      formValues;

    const _timeNeeded = parseDurationToMinutes(timeNeeded) / TIME_BLOCK_IN_MINUTES;
    const _durationMin = parseDurationToMinutes(durationMin) / TIME_BLOCK_IN_MINUTES;
    const _durationMax = parseDurationToMinutes(durationMax) / TIME_BLOCK_IN_MINUTES;

    const selectedTimePolicy = timePolicies?.find((policy) => policy.id === timePolicy);

    if (!selectedTimePolicy) {
      await showToast(Toast.Style.Failure, "Something went wrong", `Task ${title} not created`);
      return;
    }

    const created = await createTask({
      category: selectedTimePolicy.taskCategory === "WORK" ? "WORK" : "PERSONAL",
      title,
      timeNeeded: _timeNeeded,
      durationMin: _durationMin,
      durationMax: _durationMax,
      snoozeUntil,
      timePolicy: selectedTimePolicy.id,
      due,
      notes,
      priority,
      onDeck,
    });

    if (created) {
      await showToast(Toast.Style.Success, "Task created", `Task ${title} created successfully`);
      await Clipboard.copy(`https://app.reclaim.ai/tasks/${created.id}`);
      await showHUD("Task URL copied to clipboard");
      await popToRoot();
    } else {
      await showToast(Toast.Style.Failure, "Something went wrong", `Task ${title} not created`);
    }
  };

  const loadTimePolicy = async () => {
    const allPolicies = await getTimePolicy("TASK_ASSIGNMENT");
    if (allPolicies) {
      setTimePolicies(allPolicies);
      if (interpreter?.personal) {
        const personalPolicy = allPolicies.find((policy) => policy.policyType === "PERSONAL");
        if (personalPolicy) {
          setTimePolicy(personalPolicy.id);
        }
      }
    }
  };

  const timePolicyOptions = useMemo(() => {
    return timePolicies
      ? timePolicies.map((policy) => ({
          title: policy.title,
          value: policy.id,
        }))
      : [];
  }, [timePolicies]);

  useEffect(() => {
    void loadTimePolicy();
  }, []);

  return (
    <Form
      isLoading={props.loading || isLoadingTimePolicy}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={userTitle} />
      <Form.Separator />
      {defaults.schedulerVersion > 14 && (
        <Form.Dropdown id="priority" title="Priority" defaultValue="P2">
          <Form.Dropdown.Item title="Critical" value="P1" />
          <Form.Dropdown.Item title="High priority" value="P2" />
          <Form.Dropdown.Item title="Medium priority" value="P3" />
          <Form.Dropdown.Item title="Low priority" value="P4" />
        </Form.Dropdown>
      )}
      <Form.TextField
        id="timeNeeded"
        error={timeNeededError}
        value={timeNeeded}
        onChange={(value) => {
          setTimeNeeded(value);
          if (Number(parseDurationToMinutes(formatDuration(value))) % TIME_BLOCK_IN_MINUTES !== 0) {
            setTimeNeededError("Must be an interval of 15 minutes. (15/30/45/60...)");
          } else {
            setTimeNeededError(undefined);
          }
        }}
        onBlur={(e) => {
          setTimeNeeded(formatDuration(e.target.value));
        }}
        title="Time needed"
      />
      <Form.TextField
        id="durationMin"
        title="Duration min"
        value={durationMin}
        error={durationMinError}
        onChange={(value) => {
          setDurationMin(value);
          if (Number(parseDurationToMinutes(formatDuration(value))) % TIME_BLOCK_IN_MINUTES !== 0) {
            setDurationMinError("Time must be in a interval of 15 minutes. (15/30/45/60...)");
          } else {
            setDurationMinError(undefined);
          }
        }}
        onBlur={(e) => {
          setDurationMin(formatDuration(e.target.value));
        }}
      />
      <Form.TextField
        id="durationMax"
        title="Duration max"
        value={durationMax}
        error={durationMaxError}
        onChange={(value) => {
          setDurationMax(value);
          if (Number(parseDurationToMinutes(formatDuration(value))) % TIME_BLOCK_IN_MINUTES !== 0) {
            setDurationMaxError("Time must be in a interval of 15 minutes. (15/30/45/60...)");
          } else {
            setDurationMaxError(undefined);
          }
        }}
        onBlur={(e) => {
          setDurationMax(formatDuration(e.target.value));
        }}
      />

      <Form.Dropdown id="timePolicy" title="Hours" value={timePolicy} onChange={setTimePolicy}>
        {timePolicyOptions?.map((policy) => (
          <Form.Dropdown.Item key={policy.value} title={policy.title} value={policy.value} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        value={snooze}
        onChange={setSnooze}
        type={Form.DatePicker.Type.DateTime}
        id="snoozeUntil"
        title="Starting"
      />
      <Form.DatePicker value={due} onChange={setDue} type={Form.DatePicker.Type.DateTime} id="due" title="Due" />
      <Form.TextArea id="notes" title="Notes" />
      {defaults.schedulerVersion > 14 && (
        <Form.Checkbox id="onDeck" title="Send to Up Next" label="" defaultValue={false} />
      )}
    </Form>
  );
};
