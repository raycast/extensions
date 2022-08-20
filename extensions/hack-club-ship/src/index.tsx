import { Form, ActionPanel, Action, showToast, getPreferenceValues } from "@raycast/api";
import { WebClient } from "@slack/web-api";
import { grabFile } from "./utils/grab-file";
import { useState, useEffect } from "react";
import { createReadStream } from "fs";

type Values = {
  title?: string;
  message: string;
  channel: string;
};

export default function Command() {
  const { token } = getPreferenceValues();
  const web = new WebClient(token);
  const [image, setImage] = useState<string>();

  useEffect(() => {
    grabFile()
      .then((file) => {
        setImage(file[0].path);
      })
      .catch((err) => {
        setImage("");
      });
  });

  async function handleSubmit(values: Values) {
    const title = values.title ? values.title + "\n\n" : "";
    const message = title + values.message;

    if (image !== "") {
      const result = await web.files.upload({
        file: createReadStream(image as string),
        channels: values.channel,
        initial_comment: message,
      });

      console.log(`sent ${result.ts}`);
    } else {
      const result = await web.chat.postMessage({
        text: message,
        channel: values.channel,
      });

      console.log(`sent ${result.ts}`);
    }

    showToast({ title: "Success!", message: "Your project has been shipped! Congratulations!" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Ship a project to the Hack Club Slack!" />
      <Form.TextField id="title" title="Title (optional)" placeholder="Title" />
      <Form.TextArea
        id="message"
        title="Ship message"
        placeholder="Detail your ship! Feel free to add demo links too!"
      />
      <Form.Separator />
      <Form.Dropdown id="channel" title="Channel">
        <Form.Dropdown.Item value="C0M8PUPU6" title="Ship" />
        <Form.Dropdown.Item value="C01504DCLVD" title="Scrapbook" />
      </Form.Dropdown>
      {image !== "" ? <Form.Description text={`Selected ${image}`} /> : <Form.Description text="No image selected!" />}
    </Form>
  );
}
