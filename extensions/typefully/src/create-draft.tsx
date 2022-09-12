import { Form, ActionPanel, Action, showToast, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import got from "got";

import Preferences from "./interfaces/preferences";

type Values = {
  content: string;
  threadify: boolean;
  schedule_date?: Date;
  share_options: string;
};

const Command = () => {
  const preferences = getPreferenceValues<Preferences>();
  const [shareOptions, setShareOptions] = useState<string>();

  async function handleSubmit(values: Values) {
    showToast({ title: "Submitting to Typefully", message: "We've submitted your draft to Typefully." });

    const data: Record<string, any> = {
      content: values.content,
      threadify: values.threadify,
    };

    if (values.share_options == "schedule-share") {
      data["schedule-date"] = values.schedule_date;
    }

    if (values.share_options == "schedule-next-free-slot") {
      data["schedule-date"] = "next-free-slot";
    }

    try {
      await got
        .post("https://api.typefully.com/v1/drafts/", {
          json: data,
          headers: {
            "X-API-KEY": `Bearer ${preferences.token}`,
          },
        })
        .json();
    } catch (error) {
      showToast({ title: "Whoops!", message: "Something went wrong while submitting to Typefully." });
    }

    showToast({ title: "Submitted to Typefully", message: "Your draft made it to Typefully! 🥳" });
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
        title="Draft 🪶"
        autoFocus={true}
        placeholder="Craft your next communication"
        storeValue
      />
      <Form.Separator />
      <Form.Dropdown id="share_options" title="Schedule" onChange={setShareOptions}>
        <Form.Dropdown.Item value="save-as-draft" title="Save as draft" />
        <Form.Dropdown.Item value="schedule-share" title="Schedule" />
        <Form.Dropdown.Item value="schedule-next-free-slot" title="Schedule to next free slot" />
      </Form.Dropdown>
      <Form.Checkbox
        id="threadify"
        title="Threadify?"
        label="Automatically split long threads into multiple tweets?"
        storeValue
      />
      {shareOptions == "schedule-share" && (
        <Form.DatePicker type={Form.DatePicker.Type.DateTime} id="schedule_date" title="Date picker" />
      )}
    </Form>
  );
};

export default Command;
