import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useState } from "react";

export default function AddStorybookCommand() {
  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setURLError] = useState<string | undefined>();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function dropURLErrorIfNeeded() {
    if (urlError && urlError.length > 0) {
      setURLError(undefined);
    }
  }

  return (
    <Form
      navigationTitle="Add a Storybook"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            icon={Icon.Info}
            title="Learn More About StoriesJson Mode"
            url="https://storybook.js.org/docs/react/api/main-config-features#buildstoriesjson"
          />
          <Action.SubmitForm title="Submit Name" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Name"
        placeholder="Enter name of your Storybook"
        autoFocus
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="urlField"
        title="URL"
        placeholder="Enter the URL for your published Storybook"
        error={urlError}
        onChange={dropURLErrorIfNeeded}
        onBlur={(event) => {
          const value = event.target.value;
          if (!value || value?.length == 0) {
            setURLError("The field should't be empty!");
          } else if (value && value?.length > 0 && !validateUrl(value)) {
            setURLError("The URL is not valid!");
          } else {
            dropURLErrorIfNeeded();
          }
        }}
      />
      <Form.Description text="The extension only supports published Storybooks using the stories.json mode" />
    </Form>
  );
}

// eslint-disable-next-line no-useless-escape
const urlRegex = new RegExp(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/);

function validateUrl(value: string) {
  console.log(value.match(urlRegex));

  return value.match(urlRegex);
}
