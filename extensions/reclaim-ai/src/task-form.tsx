import "./initSentry";

import { Action, ActionPanel, Clipboard, Form, Toast, popToRoot, showHUD, showToast } from "@raycast/api";
import { addDays, addMinutes, setHours, setMilliseconds, setMinutes, setSeconds } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useCallbackSafeRef } from "./hooks/useCallbackSafeRef";
import { useTaskActions } from "./hooks/useTask";
import { useTimePolicy } from "./hooks/useTimePolicy";
import { useUser } from "./hooks/useUser";
import { TaskPlanDetails } from "./types/plan";
import { makeOrderedListComparator } from "./utils/arrays";
import { TIME_BLOCK_IN_MINUTES, formatDuration, parseDurationToMinutes } from "./utils/dates";
import { withRAIErrorBoundary } from "./components/RAIErrorBoundary";

export const timeSchemeTitleComparator = makeOrderedListComparator<string>(["Working Hours", "Personal Hours"]);

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

const getDefaultDueDate = (defaultDueDatePreference: number | undefined) => {
  if (defaultDueDatePreference) {
    let defaultDueDate = addDays(new Date(), defaultDueDatePreference);
    // Set the time toward the end of the day
    defaultDueDate = setHours(defaultDueDate, 18);
    defaultDueDate = setMinutes(defaultDueDate, 0);
    defaultDueDate = setSeconds(defaultDueDate, 0);
    defaultDueDate = setMilliseconds(defaultDueDate, 0);
    return defaultDueDate;
  }

  return null;
};

function Command(props: Props) {
  const { timeNeeded: userTimeNeeded, title: userTitle, interpreter } = props;

  /********************/
  /*   custom hooks   */
  /********************/

  const { currentUser } = useUser();
  const { createTask } = useTaskActions();
  const { timePolicies, isLoading: isLoadingTimePolicy } = useTimePolicy();

  /********************/
  /*     useState     */
  /********************/

  const defaults = useMemo(() => {
    // RAI-10338 respect user settings of no default due date and no default snooze date
    const defaultAlwaysPrivate = currentUser?.features.taskSettings.defaults.alwaysPrivate;
    const defaultOnDeck = currentUser?.features.taskSettings.defaults.onDeck;
    const defaultDueDatePreference = currentUser?.features.taskSettings.defaults.dueInDays;
    const defaultDueDate = getDefaultDueDate(defaultDueDatePreference);
    const defaultDelayedStartPreference = currentUser?.features.taskSettings.defaults.delayedStartInMinutes;
    const defaultSnoozeDate = defaultDelayedStartPreference
      ? addMinutes(new Date(), defaultDelayedStartPreference)
      : null;
    return {
      defaultDueDate: defaultDueDate,
      defaultSnoozeDate: defaultSnoozeDate,
      alwaysPrivate: defaultAlwaysPrivate,
      onDeck: defaultOnDeck,
      minDuration: (currentUser?.features.taskSettings.defaults.minChunkSize || 1) * TIME_BLOCK_IN_MINUTES,
      maxDuration: (currentUser?.features.taskSettings.defaults.maxChunkSize || 1) * TIME_BLOCK_IN_MINUTES,
      duration: (currentUser?.features.taskSettings.defaults.timeChunksRequired || 1) * TIME_BLOCK_IN_MINUTES,
      schedulerVersion: currentUser?.features.scheduler || 14,
    };
  }, [currentUser]);

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
  const [timePolicyId, setTimePolicyId] = useState<string>("");

  const [due, setDue] = useState<Date | null>(interpreter?.due ? new Date(interpreter.due) : defaults.defaultDueDate);
  const [snooze, setSnooze] = useState<Date | null>(
    interpreter?.snoozeUntil ? new Date(interpreter.snoozeUntil) : defaults.defaultSnoozeDate
  );

  /********************/
  /* useMemo & consts */
  /********************/

  const filteredPolicies = useMemo(
    () =>
      timePolicies
        ?.filter((policy) => !!policy.features.find((f) => f === "TASK_ASSIGNMENT"))
        .sort((a, b) => timeSchemeTitleComparator(a.title, b.title)),
    [timePolicies]
  );

  /********************/
  /*    useCallback   */
  /********************/

  const handleSubmit = useCallbackSafeRef(async (formValues: FormValues) => {
    await showToast(Toast.Style.Animated, "Creating Task...");
    const { timeNeeded, durationMin, durationMax, snoozeUntil, due, notes, title, timePolicy, priority, onDeck } =
      formValues;

    const _timeNeeded = parseDurationToMinutes(timeNeeded) / TIME_BLOCK_IN_MINUTES;
    const _durationMin = parseDurationToMinutes(durationMin) / TIME_BLOCK_IN_MINUTES;
    const _durationMax = parseDurationToMinutes(durationMax) / TIME_BLOCK_IN_MINUTES;

    const selectedTimePolicy = filteredPolicies?.find((policy) => policy.id === timePolicy);

    if (!selectedTimePolicy) {
      await showToast(Toast.Style.Failure, "Something went wrong", `Task ${title} not created`);
      return;
    }

    const _alwaysPrivate = defaults.alwaysPrivate === undefined ? false : defaults.alwaysPrivate;

    const created = await createTask({
      title,
      timePolicy: selectedTimePolicy.id,
      category: selectedTimePolicy.taskCategory === "WORK" ? "WORK" : "PERSONAL",
      timeNeeded: _timeNeeded,
      durationMin: _durationMin,
      durationMax: _durationMax,
      snoozeUntil,
      due,
      notes,
      alwaysPrivate: _alwaysPrivate,
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
  });

  /********************/
  /*    useEffects    */
  /********************/

  useEffect(() => {
    if (filteredPolicies && interpreter?.personal) {
      const personalPolicy = filteredPolicies.find((policy) => policy.policyType === "PERSONAL");
      if (personalPolicy) setTimePolicyId(personalPolicy.id);
    }
  }, [filteredPolicies, interpreter]);

  /********************/
  /*       JSX        */
  /********************/

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
          <Form.Dropdown.Item title="High Priority" value="P2" />
          <Form.Dropdown.Item title="Medium Priority" value="P3" />
          <Form.Dropdown.Item title="Low Priority" value="P4" />
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

      <Form.Dropdown id="timePolicy" title="Hours" value={timePolicyId} onChange={setTimePolicyId}>
        {filteredPolicies?.map((policy) => (
          <Form.Dropdown.Item key={policy.id} title={policy.title} value={policy.id} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        value={snooze}
        onChange={setSnooze}
        type={Form.DatePicker.Type.DateTime}
        id="snoozeUntil"
        title="Start After"
      />
      <Form.DatePicker value={due} onChange={setDue} type={Form.DatePicker.Type.DateTime} id="due" title="Due" />
      <Form.TextArea id="notes" title="Notes" />
      {defaults.schedulerVersion > 14 && (
        <Form.Checkbox id="onDeck" title="Send to Up Next" label="" defaultValue={defaults.onDeck} />
      )}
    </Form>
  );
}

export default withRAIErrorBoundary(Command);
