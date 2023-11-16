import { Form, ActionPanel, Action, showHUD } from "@raycast/api";
import { addEntry } from "./day-one";
import { useCachedState } from "@raycast/utils";

type Values = {
  body: string;
  date: Date;
  journal?: string;
};

export default function Command() {
  const [journal, setJournal] = useCachedState<string | undefined>("journal", undefined);
  const [error, setError] = useCachedState("error", "");

  async function handleSubmit(values: Values) {
    const { body, date, journal } = values;

    try {
      await addEntry({
        body,
        date,
        journal,
      });

      showHUD(journal ? `Saved entry in "${journal}"` : "Saved entry!");
    } catch (error) {
      if (typeof error === "string" && error.includes("journal")) {
        setError("journal");
      } else {
        setError("unknown");
      }
    }
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="body" title="Body" placeholder="What's on your mind?" autoFocus enableMarkdown />
      <Form.DatePicker
        id="date"
        title="Date"
        info="You can add entries to any day. Defaults to today."
        type={Form.DatePicker.Type.Date}
        defaultValue={new Date()}
      />

      <Form.TextField
        id="journal"
        title="Journal"
        placeholder="Default"
        value={journal}
        info="What journal should this be added to? If it does not already exist, this will fail."
        error={error === "journal" ? "Journal does not exist" : undefined}
        onChange={(value) => {
          setJournal(value);
          setError("");
        }}
      />
    </Form>
  );
}
