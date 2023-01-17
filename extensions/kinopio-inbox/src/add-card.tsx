import {
  Form,
  ActionPanel,
  Action,
  Toast,
  showToast,
  getPreferenceValues,
  LaunchProps,
  Preferences,
} from "@raycast/api";
import { useState, useRef } from "react";
import fetch from "cross-fetch";

const cardLimit = 300;
const host = "https://api.kinopio.club";
// const host = "http://kinopio.local:3000";

type Values = {
  name: string;
  status: number;
};

export default function Command(props: LaunchProps<{ draftValues: Values }>) {
  const { draftValues } = props;
  const [nameError, setNameError] = useState<string | undefined>();
  const textFieldRef = useRef<Form.TextField>(null);

  const preferences = getPreferenceValues<Preferences>();
  console.log("🙈 apiKey", preferences.apiKey);

  function validateName(value: string) {
    const characterLimitError = value.length > cardLimit;
    if (characterLimitError) {
      setNameError(`Cards cannot be longer than ${cardLimit} characters`);
    } else {
      setNameError(undefined);
    }
  }

  async function handleSubmit(values: Values) {
    console.log("🎑", values);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving card",
    });
    try {
      let data = { name: values.name, status: 200 };
      const url = `${host}/card/to-inbox`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "must-revalidate, no-store, no-cache, private",
          Authorization: `${preferences.apiKey}`,
        },
        body: JSON.stringify(data),
      });
      data = await response.json();
      console.log("🐸 response", url, response.status, data);
      const errorStatus = [400, 401, 404, 500];
      if (errorStatus.includes(response.status) || errorStatus.includes(data.status)) {
        throw data;
      }
      textFieldRef.current?.reset();
      toast.style = Toast.Style.Success;
      toast.title = "Saved card to your inbox";
      // eslint-disable-next-line no-empty
    } catch (error) {
      console.error("🚒 handleSubmit", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to save card";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
          <Action.OpenInBrowser url="http://kinopio.club/inbox" />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="name"
        title="New Card"
        placeholder="Type text here, or paste a URL"
        defaultValue={draftValues?.name}
        autoFocus={true}
        enableMarkdown={true}
        onChange={validateName}
        error={nameError}
        info="Markdown is supported"
        ref={textFieldRef}
      />
    </Form>
  );
}
