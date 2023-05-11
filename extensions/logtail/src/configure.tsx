import { LogTail } from "./lib/logtail";

import { Action, ActionPanel, Icon, Form } from "@raycast/api";
import { useState } from "react";

const ConfigureCommand = (props: { onSubmit?: () => void }) => {
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);

  function dropPasswordErrorIfNeeded() {
    if (passwordError && passwordError.length > 0) {
      setPasswordError(undefined);
    }
  }

  function handlePasswordBlur(event: Form.Event<string>) {
    const value = event.target.value;
    if (value && value.length > 0) {
      dropPasswordErrorIfNeeded();
    } else {
      setPasswordError("The field should't be empty!");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save LogTail API Token"
            icon={Icon.Lock}
            onSubmit={async (value: Form.Values) => {
              await LogTail.setToken(value.password);
              props.onSubmit?.();
            }}
          />
          <Action.OpenInBrowser url={LogTail.DOCS_URL} title="Open LogTail API Docs" />
        </ActionPanel>
      }
    >
      <Form.PasswordField
        id="password"
        title="LogTail API Token"
        autoFocus
        placeholder="Enter your LogTail API Token"
        defaultValue={""}
        error={passwordError}
        onChange={dropPasswordErrorIfNeeded}
        onBlur={handlePasswordBlur}
      />
    </Form>
  );
};

export default ConfigureCommand;
