import { Action, ActionPanel, Form, LocalStorage, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Config } from "./types";
import { BASE_URL_STORAGE_KEY } from "./constants";
import Top from "./top";

const EditConfig = () => {
  const { push } = useNavigation();
  const [baseUrlError, setBaseUrlError] = useState<string | undefined>();

  const dropBaseUrlErrorIfNeeded = () => {
    if (baseUrlError && baseUrlError.length > 0) {
      setBaseUrlError(undefined);
    }
  };

  const onSubmit = async (config: Config) => {
    await LocalStorage.setItem(BASE_URL_STORAGE_KEY, config.baseUrl);
    push(<Top />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Config" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="baseUrl"
        title="Storybook Server Base URL"
        placeholder="http://localhost:6006"
        error={baseUrlError}
        onChange={dropBaseUrlErrorIfNeeded}
        onBlur={(event) => {
          if (validateUrl(event.target.value ?? "")) {
            dropBaseUrlErrorIfNeeded();
          } else {
            setBaseUrlError("Invalid URL");
          }
        }}
      />
    </Form>
  );
};

const validateUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default EditConfig;
