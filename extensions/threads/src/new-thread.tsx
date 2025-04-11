import React from "react";
import { useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  open,
} from "@raycast/api";
import { constructPostIntent } from "./lib/post-intent";

interface ThreadValues {
  content: string;
  attachment?: string;
}

export default function ComposeThread() {
  const [contentError, setContentError] = useState<string | undefined>();

  function dropContentErrorIfNeeded() {
    if (contentError && contentError.length > 0) {
      setContentError(undefined);
    }
  }

  async function handleSubmit(values: ThreadValues) {
    if (values.content.trim().length === 0) {
      setContentError("Can't be blank");
      return;
    }

    // Here you would typically send the data to your API
    console.log("Posting thread:", values);

    const postIntentUrl = constructPostIntent({
      text: values.content,
      attachment: values.attachment,
    });

    try {
      await open(postIntentUrl);
      await showToast({
        style: Toast.Style.Success,
        title: "Opening Threads",
        message: "Posting your thread in the browser",
      });
    } catch (error) {
      console.error("Error opening Threads:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to open Threads in the browser",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Start a new thread..."
        error={contentError}
        onChange={dropContentErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.trim().length === 0) {
            setContentError("Can't be blank");
          }
        }}
      />
      <Form.TextField
        id="attachment"
        title="Link"
        placeholder="https://threads.net"
      />
    </Form>
  );
}
