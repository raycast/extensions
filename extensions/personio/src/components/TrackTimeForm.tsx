import { Action, ActionPanel, Form, Icon, openCommandPreferences } from "@raycast/api";
import { SubmitTimeFormValues } from "../api/api";

export function TrackTimeForm(props: {
  onSubmit: (formValues: SubmitTimeFormValues) => void;
  onStartDateChange?: (newDate: Date | null) => void;
  onBreakTimeChange?: (newBreakTime: string) => void;
  description: string;
  employeeName: string;
  defaultStartDate: Date | null;
  defaultEndDate: Date | null;
  defaultBreakTime: string;
}) {
  return (
    <Form
      navigationTitle="Track Time"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Time" icon={Icon.Checkmark} onSubmit={props.onSubmit} />
          <Action title="Change Employee Number" icon={Icon.Person} onAction={openCommandPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description title="" text={`Hi ${props.employeeName}\n\n${props.description}`} />
      <Form.Separator />
      <Form.DatePicker
        id="startDate"
        title="Start time"
        defaultValue={props.defaultStartDate}
        onChange={props.onStartDateChange}
      />
      <Form.DatePicker id="endDate" title="End time" defaultValue={props.defaultEndDate} />
      <Form.TextField
        id="breakTime"
        title="Break (in minutes)"
        defaultValue={props.defaultBreakTime}
        onChange={props.onBreakTimeChange}
      />
    </Form>
  );
}
