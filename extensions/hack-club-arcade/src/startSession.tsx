import React, { useState } from "react";
import { Action, Form, ActionPanel, showHUD, Toast, getPreferenceValues, showToast } from "@raycast/api";
import fetch from "node-fetch";

export default function startSession() {
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    try {
      const response = await fetch(`https://hackhour.hackclub.com/api/start/${getPreferenceValues().userid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getPreferenceValues().apiToken}`,
        },
        body: JSON.stringify({ work: description }),
      });

      if (response.ok) {
        await showHUD("Session started successfully!");
      } else {
        await showToast({ style: Toast.Style.Failure, title: "Failed to start session" });
      }
    } catch (error) {
      console.error("An error occurred", error);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Session" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="description"
        title="Description"
        info="What do you plan to achieve in this session?"
        placeholder="This session I will..."
        autoFocus={true}
        onChange={(value) => setDescription(value)}
      />
      <Form.Separator />
      {/* <Form.Checkbox id='notify' label='Remind Me' defaultValue={true} info='You will get a notification 10 minutes before the session ends' /> */}
    </Form>
  );
}
