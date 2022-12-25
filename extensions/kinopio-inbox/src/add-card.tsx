import {
  Form,
  ActionPanel,
  Action,
  Toast,
  showToast,
  getPreferenceValues,
  open,
  LaunchProps,
  Preferences,
} from "@raycast/api";
import { useState, useRef } from "react";
import got from "got";

const cardLimit = 300;
const host = "https://api.kinopio.club";

type Values = {
  name: string;
};

export default function Command(props: LaunchProps<{ draftValues: Values }>) {
  const { draftValues } = props;
  const [nameError, setNameError] = useState<string | undefined>();
  const textFieldRef = useRef<Form.TextField>(null);

  const preferences = getPreferenceValues<Preferences>();
  console.log("🙈", preferences.apiKey);

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
      const url = `${host}/card/to-inbox`;
      await got.post({
        url,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "must-revalidate, no-store, no-cache, private",
          Authorization: `${preferences.apiKey}`,
        },
        json: { name: values.name },
        responseType: "json",
      });
      console.log("🐸");
      textFieldRef.current?.reset();
      toast.style = Toast.Style.Success;
      toast.title = "Saved card to your inbox";
    } catch (error) {
      console.error("🚒", error);
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
