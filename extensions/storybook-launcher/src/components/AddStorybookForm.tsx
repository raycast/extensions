import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";

export function AddStorybookForm(props: { onCreate: (name: string, url: string) => void }) {
  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setURLError] = useState<string | undefined>();

  const { pop } = useNavigation();
  const { onCreate } = props;

  const handleSubmit = useCallback(
    (values: { name: string; url: string }) => {
      onCreate(values.name, values.url);
      console.log("values", values);

      pop();
    },
    [onCreate, pop]
  );

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
          <Action.SubmitForm title="Add Storybook" onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            icon={Icon.Info}
            title="Learn More About StoriesJson Mode"
            url="https://storybook.js.org/docs/react/api/main-config-features#buildstoriesjson"
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
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
        id="url"
        title="URL"
        placeholder="Enter the base URL for your published Storybook (no trailing slash)"
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
      <Form.Description text="The extension only supports published Storybooks using the stories.json mode. Use cmd + l to learn more" />
    </Form>
  );
}

// eslint-disable-next-line no-useless-escape
const urlRegex = new RegExp(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/);

function validateUrl(value: string) {
  console.log(value.match(urlRegex));

  return value.match(urlRegex);
}
