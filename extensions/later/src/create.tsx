import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";
import { expression } from "./utils/scripts";
import { add_link_handler } from "./utils/handler";

const create = () => {
  const regex = new RegExp(expression);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();
  const { pop } = useNavigation();

  function dropTitleError() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }
  function dropUrlError() {
    if (urlError && urlError.length > 0) {
      setUrlError(undefined);
    }
  }

  const handleSubmit = useCallback(
    async (values: { title: string; url: string }) => {
      const formattedURL = values.url.trim();
      const formattedTitle = values.title.trim();
      if (
        !titleError &&
        !urlError &&
        formattedTitle.length > 0 &&
        formattedURL.match(regex) &&
        formattedURL.length > 0
      ) {
        await add_link_handler(formattedURL, formattedTitle);
      }
      pop();
    },
    [titleError, urlError],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        error={titleError}
        onChange={dropTitleError}
        onBlur={(event) => {
          if (event.target.value?.trim().length === 0) {
            setTitleError("Title cannot be empty");
          } else {
            dropTitleError();
          }
        }}
      />
      <Form.TextField
        id="url"
        title="URL"
        error={urlError}
        onChange={dropUrlError}
        onBlur={(event) => {
          if (!event.target.value?.trim().match(regex)) {
            setUrlError("URL is not valid");
          } else {
            dropUrlError();
          }
        }}
      />
    </Form>
  );
};

export default create;
