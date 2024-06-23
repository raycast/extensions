import {
  ActionPanel,
  Action,
  Form,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { useGetDeckNames } from "./hooks/useGetDeckNames";
import { useState, useCallback } from "react";
import { usePostDeckName } from "./hooks/usePostDeckName";
import { useSyncAnki } from "./hooks/useSyncAnki";

export default function Command() {
  const {
    deckNames,
    selectedDeckName,
    setSelectedDeckName,
    isDeckNamesFetched,
    refetch,
  } = useGetDeckNames();
  const [newDeckName, setNewDeckName] = useState<string>("");
  const postDeckName = usePostDeckName();
  const { fetchSyncAnki } = useSyncAnki();

  const handleSubmit = useCallback(async () => {
    if (deckNames.includes(newDeckName)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Deck name already exists",
        message: "Please choose a different name",
      });
      return;
    }

    if (newDeckName) {
      await postDeckName(newDeckName);
      refetch();
    }
  }, [newDeckName, deckNames, postDeckName, refetch]);

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
      <Form.TextField
        id="newDeckName"
        title="New Deckname"
        placeholder="Enter your new Deckname…"
        onChange={(value) => setNewDeckName(value)}
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
