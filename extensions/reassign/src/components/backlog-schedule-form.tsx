import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { isIsoDate, isoToDate, todayISO } from "../lib/format";
import type { BacklogItem } from "../lib/schedule-model";

interface ScheduleFormValues {
  date: Date | null;
  start: string;
}

/**
 * Place a parked item into the day with the `schedule` backlog op. It needs a
 * date and a start; the server derives the end from the item's duration. The
 * default date is the item's planned date, else today.
 */
export function BacklogScheduleForm(props: {
  item: BacklogItem;
  onSubmit: (date: string, start: string) => Promise<void>;
}) {
  const { item, onSubmit } = props;
  const { pop } = useNavigation();
  const defaultDate = isIsoDate(item.plannedDate) ? item.plannedDate : todayISO();

  async function submit(values: ScheduleFormValues) {
    const date = values.date ? todayISO(values.date) : defaultDate;
    const start = values.start.trim();
    if (!/^\d{1,2}:\d{2}$/.test(start)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Add a start time",
        message: "Write the time as HH:MM, for example 09:30.",
      });
      return;
    }
    await onSubmit(date, start);
    pop();
  }

  return (
    <Form
      navigationTitle={`Schedule “${item.name || "idea"}”`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Schedule Block" icon={Icon.Calendar} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Idea" text={item.name || "(untitled)"} />
      <Form.DatePicker
        id="date"
        title="Date"
        type={Form.DatePicker.Type.Date}
        defaultValue={isoToDate(defaultDate)}
      />
      <Form.TextField id="start" title="Start" placeholder="HH:MM" />
    </Form>
  );
}
