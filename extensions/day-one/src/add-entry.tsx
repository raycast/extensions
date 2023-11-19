import { Form, ActionPanel, Action, showHUD, Detail, open, LaunchProps, popToRoot, PopToRootType } from "@raycast/api";
import { missingCLIError, useDayOneIntegration } from "./day-one";
import { useCachedState } from "@raycast/utils";
import { useCallback, useState } from "react";

type Values = {
  body: string;
  date: Date;
  journal?: string;
};

const AddEntryCommand = ({ draftValues }: LaunchProps) => {
  const { installed, addEntry } = useDayOneIntegration();

  const [body, setBody] = useState(draftValues?.body || "");
  const [journal, setJournal] = useCachedState("journal", draftValues?.journal || "");
  const [date, setDate] = useState(draftValues?.date || new Date());
  const [error, setError] = useState("");

  type SubmitOptions = {
    notify: boolean;
  };

  const submitEntry = useCallback(async (values: Values, options: SubmitOptions): Promise<string | null> => {
    try {
      const entryId = await addEntry(values);

      if (options.notify) {
        showHUD(values.journal ? `Saved entry in "${values.journal}"` : "Saved entry!", {
          popToRootType: PopToRootType.Immediate,
        });
      }

      return entryId;
    } catch (error) {
      if (typeof error === "string" && error.includes("journal")) {
        setError("journal");
      } else {
        setError("unknown");
      }

      return null;
    }
  }, []);

  async function submitAndOpen(values: Values) {
    const entryId = await submitEntry(values, { notify: false });

    void open(`dayone://view?entryId=${entryId}`);
    void popToRoot();
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
          <Action.SubmitForm title="Save" onSubmit={(values: Values) => void submitEntry(values, { notify: true })} />
          <Action.SubmitForm title="Save and Open" onSubmit={submitAndOpen} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="body"
        title="Body"
        placeholder="What's on your mind?"
        autoFocus
        enableMarkdown
        value={body}
        onChange={setBody}
      />
      <Form.DatePicker
        id="date"
        title="Date"
        info="You can add entries to any day. Defaults to today."
        type={Form.DatePicker.Type.Date}
        value={date}
        onChange={setDate}
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
};

export default AddEntryCommand;
