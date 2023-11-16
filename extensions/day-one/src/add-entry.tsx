import { Form, ActionPanel, Action, showHUD, Detail, open } from "@raycast/api";
import { missingCLIError, useDayOneIntegration } from "./day-one";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";

type Values = {
  body: string;
  date: Date;
  journal?: string;
};

export default function Command() {
  const { installed, addEntry } = useDayOneIntegration();

  const [journal, setJournal] = useCachedState<string | undefined>("journal", undefined);
  const [error, setError] = useState("");

  async function submit(values: Values) {
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

  async function submitAndOpen(values: Values) {
    const { body, date, journal } = values;

    try {
      const entryId = await addEntry({
        body,
        date,
        journal,
      });
      const url = `dayone://view?entryId=${entryId}`;

      void open(url);
    } catch (error) {
      if (typeof error === "string" && error.includes("journal")) {
        setError("journal");
      } else {
        setError("unknown");
      }
    }
  }

  if (installed === "pending") {
    return null;
  } else if (!installed) {
    return <Detail markdown={missingCLIError} />;
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={submit} />
          <Action.SubmitForm title="Save and Open" onSubmit={submitAndOpen} />
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
