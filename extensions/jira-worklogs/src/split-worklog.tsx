import { useState } from "react";
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { randomUUID } from "crypto";
import { addHours, addMinutes, differenceInSeconds, isAfter, isBefore, isValid } from "date-fns";

import { Worklog } from "@/types/models";
import { getErrorMessage } from "@/utils/format";
import { saveWorklog } from "@/utils/storage";

interface Props {
  worklog: Worklog;
  onSave?: () => void;
}

export default function SplitWorklogCommand({ worklog, onSave }: Props) {
  const [splitTime, setSplitTime] = useState<Date | null>(new Date());
  const [gapDuration, setGapDuration] = useState<string>("0");
  const [gapUnit, setGapUnit] = useState<"minutes" | "hours">("minutes");
  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation();

  async function handleSubmit() {
    if (!splitTime || !isValid(splitTime)) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid split time" });
      return;
    }

    const duration = parseInt(gapDuration);
    if (isNaN(duration) || duration < 0) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid gap duration" });
      return;
    }

    const originalstartTime = new Date(worklog.startTime);
    if (!isAfter(splitTime, originalstartTime)) {
      await showToast({ style: Toast.Style.Failure, title: "Split time must be after start time" });
      return;
    }

    let secondLogStartTime: Date;
    if (gapUnit === "minutes") {
      secondLogStartTime = addMinutes(splitTime, duration);
    } else {
      secondLogStartTime = addHours(splitTime, duration);
    }

    if (worklog.endTime) {
      const originalEndTime = new Date(worklog.endTime);
      if (!isBefore(splitTime, originalEndTime)) {
        await showToast({ style: Toast.Style.Failure, title: "Split time must be before end time" });
        return;
      }
      if (!isBefore(secondLogStartTime, originalEndTime)) {
        await showToast({ style: Toast.Style.Failure, title: "Gap pushes start time past original end time" });
        return;
      }
    } else {
      // In-progress worklog
      if (isAfter(secondLogStartTime, new Date())) {
        await showToast({ style: Toast.Style.Failure, title: "New part cannot start in the future" });
        return;
      }
    }

    setIsLoading(true);
    try {
      // 1. Update first log
      const updatedFirstLog: Worklog = {
        ...worklog,
        endTime: splitTime.toISOString(),
        durationSeconds: differenceInSeconds(splitTime, originalstartTime),
      };

      // 2. Create second log
      const secondLog: Worklog = {
        id: randomUUID(),
        taskId: worklog.taskId,
        taskSummary: worklog.taskSummary,
        description: worklog.description,
        startTime: secondLogStartTime.toISOString(),
        endTime: worklog.endTime,
        durationSeconds: worklog.endTime
          ? differenceInSeconds(new Date(worklog.endTime), secondLogStartTime)
          : undefined,
      };

      await saveWorklog(updatedFirstLog);
      await saveWorklog(secondLog);

      await showToast({ style: Toast.Style.Success, title: "Worklog Split" });
      if (onSave) onSave();
      navigation.pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to split worklog",
        message: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Split Worklog" icon={{ source: "scissors" }} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="splitTime" title="Split Time" value={splitTime} onChange={setSplitTime} />
      <Form.Separator />
      <Form.TextField
        id="gapDuration"
        title="Gap Duration"
        placeholder="0"
        value={gapDuration}
        onChange={setGapDuration}
      />
      <Form.Dropdown
        id="gapUnit"
        title="Gap Unit"
        value={gapUnit}
        onChange={(val) => setGapUnit(val as "minutes" | "hours")}
      >
        <Form.Dropdown.Item value="minutes" title="Minutes" />
        <Form.Dropdown.Item value="hours" title="Hours" />
      </Form.Dropdown>
    </Form>
  );
}
