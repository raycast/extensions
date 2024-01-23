import { useState } from "react";
import Protected from "./components/protected";
import { Form, ActionPanel, Action, popToRoot, Toast, showToast, Icon } from "@raycast/api";
import { createNoteSchema } from "./lib/schemas";
import { supabase } from "./supabase";
import { signOut } from "./auth/google";

export default function AddNote() {
  const [descriptionError, setDescriptionError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  function dropDescriptionErrorIfNeeded() {
    if (descriptionError && descriptionError.length > 0) {
      setDescriptionError(undefined);
    }
  }

  async function handleFormSubmit(values: { content: string; description: string }) {
    setIsLoading(true);

    const formatedValues = {
      ...values,
      content: [
        {
          type: "p",
          children: [{ text: values.content }],
        },
      ],
    };
    const validatedValues = createNoteSchema.parse(formatedValues);

    const { error } = await supabase.functions.invoke("create-note", {
      body: JSON.stringify(validatedValues),
    });
    setIsLoading(false);
    if (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to add note" });
      return;
    }
    showToast({ style: Toast.Style.Success, title: "Successfully added note" });
    popToRoot();
  }
  return (
    <Protected>
      <Form
        isLoading={isLoading}
        enableDrafts
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Add Note" icon={Icon.Plus} onSubmit={handleFormSubmit} />
            <Action.OpenInBrowser title="Go to Splix.app" icon={Icon.Globe} url={"https://splix.app"} />
            <Action title="Sign Out" icon={Icon.Logout} onAction={signOut} />
          </ActionPanel>
        }
      >
        <Form.TextArea id="content" title="Note Content" placeholder="Note content..." />
        <Form.TextArea
          id="description"
          title="Note Description"
          placeholder="Note description..."
          error={descriptionError}
          onChange={dropDescriptionErrorIfNeeded}
          onBlur={(event) => {
            if (!event.target.value) return;
            if (event.target.value?.length < 2) {
              setDescriptionError("Description must be at least 2 characters.");
            } else if (event.target.value?.length > 300) {
              setDescriptionError("Description must be less than 300 characters.");
            } else {
              dropDescriptionErrorIfNeeded();
            }
          }}
        />
      </Form>
    </Protected>
  );
}
