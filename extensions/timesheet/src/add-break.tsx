import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { createBreak, getTimerProjectName, getTimerStatus } from "./api";

function fmtTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AddBreak() {
  const {
    data: timer,
    isLoading,
    error,
  } = useCachedPromise(getTimerStatus, [], { initialData: null });

  if (error) {
    return (
      <Form>
        <Form.Description
          title="⚠️ Error"
          text={`Failed to load timer: ${String(error)}`}
        />
      </Form>
    );
  }

  if (isLoading || !timer) {
    return (
      <Form isLoading>
        <Form.Description title="Timer" text="Loading running timer..." />
      </Form>
    );
  }

  const taskId = timer.task?.id;
  const taskStart = timer.task?.startDateTime;
  const blocking =
    timer.status === "stopped"
      ? "No timer running. Start a timer first to log a break."
      : !taskId || !taskStart
        ? "Timer has no associated task."
        : null;

  if (blocking) {
    return (
      <Form>
        <Form.Description title="⚠️ Error" text={blocking} />
      </Form>
    );
  }

  return (
    <BreakForm
      taskId={taskId as string}
      taskStart={taskStart as string}
      projectName={getTimerProjectName(timer) ?? "Unknown project"}
    />
  );
}

interface BreakFormValues {
  startDateTime: Date | null;
  endDateTime: Date | null;
  description: string;
}

function BreakForm({
  taskId,
  taskStart,
  projectName,
}: {
  taskId: string;
  taskStart: string;
  projectName: string;
}) {
  const { pop } = useNavigation();
  const lowerBound = new Date(taskStart);
  const now = new Date();
  // Default to the last 15 minutes, clamped to when the timer actually started.
  const defaultStart = new Date(
    Math.max(lowerBound.getTime(), now.getTime() - 15 * 60 * 1000),
  );

  const { handleSubmit, itemProps } = useForm<BreakFormValues>({
    async onSubmit(values) {
      const { startDateTime: start, endDateTime: end } = values;
      if (!start || !end) return;

      // The break must sit entirely within the timer's window: [taskStart, now].
      const upperBound = new Date();
      if (start.getTime() < lowerBound.getTime()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Start is before the timer started",
          message: `Timer started at ${fmtTime(lowerBound)}`,
        });
        return;
      }
      if (end.getTime() > upperBound.getTime()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "End is in the future",
          message: "The break can't end after now",
        });
        return;
      }
      if (end.getTime() <= start.getTime()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "End must be after start",
        });
        return;
      }

      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Adding break...",
        });
        await createBreak({
          taskId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          description: values.description.trim() || undefined,
        });
        await showToast({ style: Toast.Style.Success, title: "Break added" });
        pop();
      } catch (err) {
        showFailureToast(err, { title: "Failed to add break" });
      }
    },
    initialValues: {
      startDateTime: defaultStart,
      endDateTime: now,
    },
    validation: {
      startDateTime: (value) => {
        if (!value) return "Start is required";
        if (value.getTime() < lowerBound.getTime())
          return `Must be after the timer started (${fmtTime(lowerBound)})`;
      },
      endDateTime: (value) => {
        if (!value) return "End is required";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Break"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="📍 Timer"
        text={`Logging a break on: ${projectName}`}
      />
      <Form.Description
        title="Allowed window"
        text={`Between ${fmtTime(lowerBound)} (timer start) and now`}
      />
      <Form.Separator />
      <Form.DatePicker
        title="Start"
        type={Form.DatePicker.Type.DateTime}
        {...itemProps.startDateTime}
      />
      <Form.DatePicker
        title="End"
        type={Form.DatePicker.Type.DateTime}
        {...itemProps.endDateTime}
      />
      <Form.TextField
        title="Description"
        placeholder="Optional (e.g. Lunch)"
        {...itemProps.description}
      />
    </Form>
  );
}
