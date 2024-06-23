import { ActionPanel, Action, Form, Icon } from "@raycast/api";
import { useState } from "react";
import { useGetDeckNames } from "./hooks/useGetDeckNames";
import { usePostNote } from "./hooks/usePostNote";
import { useSyncAnki } from "./hooks/useSyncAnki";

export default function Command() {
  const {
    deckNames,
    selectedDeckName,
    setSelectedDeckName,
    isDeckNamesFetched,
  } = useGetDeckNames();
  const [frontContent, setFrontContent] = useState("");
  const [backContent, setBackContent] = useState("");

  const handleSubmit = usePostNote(
    selectedDeckName!,
    frontContent,
    backContent,
  );
  const { fetchSyncAnki } = useSyncAnki();

  if (!isDeckNamesFetched) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Upload}
            title="Send to Anki"
            onSubmit={handleSubmit}
          />
          <Action
            icon={Icon.FullSignal}
            title="Sync Anki"
            onAction={() => fetchSyncAnki()}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="front"
        title="Front"
        placeholder="Enter front content…"
        value={frontContent}
        onChange={setFrontContent}
      />
      <Form.TextArea
        id="back"
        title="Back"
        placeholder="Enter back content…"
        value={backContent}
        onChange={setBackContent}
      />

      <Form.Dropdown
        id="deckName"
        title="DeckName"
        value={selectedDeckName}
        onChange={setSelectedDeckName}
      >
        {deckNames.map((deckName, index) => (
          <Form.Dropdown.Item value={deckName} title={deckName} key={index} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
