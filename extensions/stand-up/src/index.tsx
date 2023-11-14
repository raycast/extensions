import { Action, ActionPanel, Form, PopToRootType, showHUD } from "@raycast/api";
import dayjs from "dayjs";
import { addEntry, EntryType } from "./api";

interface FormDate {
  notes: string;
  date: Date,
  type: EntryType;
}


export default function Command() {
  const onSubmit = async (data: FormDate) => {
    await addEntry({
      date: data.date,
      notes: data.notes,
      type: data.type,
    })
    await showHUD(`Note added at ${dayjs(data.date).format("DD/MM @HH:mm")}`, {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    })
  }

  return (
    <Form actions={
      <ActionPanel>
        <Action.SubmitForm onSubmit={onSubmit} />
      </ActionPanel>
    }>
      <Form.Description text="Add a new stand-up note" />
      <Form.TextField id="notes" title="Note" />
      <Form.DatePicker id="date" title="Date" defaultValue={new Date()} />
      <Form.Dropdown id={"type"} defaultValue={EntryType.Note}>
        <Form.Dropdown.Item value={EntryType.Note} title="Note" />
        <Form.Dropdown.Item value={EntryType.Meeting} title="Meeting" />
      </Form.Dropdown>
    </Form>
  );
}
