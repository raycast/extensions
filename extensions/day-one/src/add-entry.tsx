import {
  Form,
  ActionPanel,
  Action,
  showHUD,
  Detail,
  open,
  LaunchProps,
  popToRoot,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { CLISyncError, missingCLIError, useDayOneIntegration } from "./day-one";
import { useCachedState } from "@raycast/utils";
import { useCallback, useState } from "react";

type Values = {
  body: string;
  date: Date;
  journal?: string;
};

const AddEntryCommand = ({ draftValues }: LaunchProps) => {
  const { installed, addEntry, loading } = useDayOneIntegration();

  const [body, setBody] = useState(draftValues?.body || "");
  const [journal, setJournal] = useCachedState("journal", draftValues?.journal || "");
  const [date, setDate] = useState(draftValues?.date || new Date());
  const [error, setError] = useState("");

  type SubmitOptions = {
    notify: boolean;
  };

  const submitEntry = useCallback(async (values: Values, options: SubmitOptions): Promise<string | null> => {
    if (values.body.length === 0) {
      showToast(Toast.Style.Failure, "Body can't be empty");
      return null;
    }

    try {
      const entryId = await addEntry(values);

      if (options.notify) {
        showHUD(values.journal ? `Saved entry in "${values.journal}"` : "Saved entry!", {
          popToRootType: PopToRootType.Immediate,
        });
      }

      return entryId;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Invalid value(s) for option -j")) {
        setError("journal");
      } else {
        setError("unknown");
      }

      return null;
    }
  }, []);

  async function submitAndOpen(values: Values) {
    const entryId = await submitEntry(values, { notify: false });

    if (entryId !== null) {
      await popToRoot();
      await open(`dayone://view?entryId=${entryId}`);
    }
  }

  if (installed !== "ready" && !loading) {
    const errorBody = installed === "missing" ? missingCLIError : CLISyncError;

    return <Detail isLoading={loading} markdown={errorBody} />;
  }

  if (loading) {
    return <Form isLoading={loading} />;
  }

  return (
    <Form
      isLoading={loading}
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
        title="Timestamp"
        info="Set the timestamp on this entry. Defaults to now."
        type={Form.DatePicker.Type.DateTime}
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
