import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { useState } from "react";
import { useMusicThreadHttpApi } from "./hooks/useMusicThreadHttpApi";
import { Thread } from "./types/threads.types";

export default function Command() {
  const [titleError, setTitleError] = useState<string | undefined>();

  const { createThread } = useMusicThreadHttpApi();

  function dropTitleErrorIfNeeded() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }

  function handleSubmit(thread: Thread) {
    createThread(thread);
    showToast({ title: "Thread created", message: "Your thread was created" });
  }

  const tagsHint = 'e.g. "albums, personal, best-of, 2020"';

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new thread in MusicThread" />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Thread title"
        error={titleError}
        onChange={dropTitleErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setTitleError("Please name your thread");
          } else {
            dropTitleErrorIfNeeded();
          }
        }}
      />
      <Form.TextArea id="description" title="Description (optional)" placeholder="Thread description" />
      <Form.TextField id="tags" title="Tags (optional)" placeholder={tagsHint} />
    </Form>
  );
}
