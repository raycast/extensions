import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import { setTemplateTimeIn } from "../lib/roster";
import { dateFromTime, timeFromDate } from "../lib/time";
import { reportError, type SaveStore } from "../lib/storage";

export function TimeInForm({
  sharedTimeIn,
  save,
  templateId,
}: {
  sharedTimeIn: string;
  save: SaveStore;
  templateId: string;
}) {
  const { pop } = useNavigation();
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  async function submit(values: { time: Date | null }) {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      if (!values.time || Form.DatePicker.isFullDay(values.time))
        throw new Error("Choose a time, including hours and minutes.");
      const time = timeFromDate(values.time);
      if (await save((store) => setTemplateTimeIn(store, templateId, time), "Template Time Saved")) pop();
    } catch (error) {
      await reportError("Could Not Set Time In", error);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <Form
      navigationTitle="Set Time In"
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Template Time" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="time"
        title="Time in"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={dateFromTime(sharedTimeIn)}
      />
      <Form.Description text="Applies to this template’s existing and future entries. No-shows display no time in. The date is ignored." />
    </Form>
  );
}
