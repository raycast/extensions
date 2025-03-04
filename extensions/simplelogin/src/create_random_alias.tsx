import {
  Form,
  ActionPanel,
  Action,
  showHUD,
  showToast,
  Clipboard,
  Toast,
  popToRoot,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { createRandomAlias } from "./api/simplelogin_api";
import getHostname from "./utils/browser";

type CommandPreferences = {
  prefill_alias_note: boolean;
};

export default function Command() {
  const { prefill_alias_note } = getPreferenceValues<CommandPreferences>();
  const [note, setNote] = useState<string>("");
  const [defaultNote, setDefaultNote] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(prefill_alias_note);

  useEffect(() => {
    if (prefill_alias_note) {
      getHostname().then((hostname) => {
        setDefaultNote(hostname ?? "");
        setIsLoading(false);
      });
    }
  }, []);

  useEffect(() => {
    // Only set the note if a default note was generated and the user hasn't started typing
    if (note === "" && defaultNote !== "") {
      setNote(defaultNote);
    }
  }, [defaultNote]);

  const handleSubmit = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating alias...",
    });

    try {
      const alias = await createRandomAlias(note.trim());
      await Clipboard.copy(alias.email);
      await showHUD("Random alias created and copied to clipboard");
      popToRoot({ clearSearchBar: true });
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create alias";
      toast.message = "Houston, we've got a problem...";
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Random Alias"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Alias"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a random SimpleLogin alias:" />
      <Form.TextArea id="note" title="Description (optional)" value={note} onChange={setNote} />
    </Form>
  );
}
