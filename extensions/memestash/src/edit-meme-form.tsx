import { useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { Meme } from "./lib/types";
import { updateMeme } from "./lib/ingest";

/**
 * Edit an existing meme's name and keywords. Pushed onto the navigation stack
 * from the search grid via Action.Push (it's a view, not a root command, so it
 * isn't registered in package.json). `onSaved` lets the grid revalidate.
 */
export function EditMemeForm({
  meme,
  onSaved,
}: {
  meme: Meme;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(meme.name);
  const [nameError, setNameError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string; keywords: string }) {
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }
    const keywords = values.keywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    try {
      updateMeme(meme.id, { name: values.name.trim(), keywords });
      await showToast({
        style: Toast.Style.Success,
        title: "Saved",
        message: values.name.trim(),
      });
      onSaved();
      pop();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't save changes",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        value={name}
        error={nameError}
        onChange={(value) => {
          setName(value);
          if (nameError) setNameError(undefined);
        }}
      />
      <Form.TextField
        id="keywords"
        title="Keywords"
        defaultValue={meme.keywords.join(", ")}
        info="Comma-separated. Searched alongside the name."
      />
    </Form>
  );
}
