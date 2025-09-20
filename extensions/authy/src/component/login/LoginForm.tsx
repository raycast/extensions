import { useEffect } from "react";
import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { login, requestLoginIfNeeded, resetRegistration, WELCOME_MESSAGE } from "./login-helper";

export default function LoginForm(props: { setLogin: (step: boolean) => void }) {
  useEffect(() => {
    (async () => {
      await requestLoginIfNeeded();
    })();
  });

  return (
    <Detail
      markdown={`${WELCOME_MESSAGE}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Checkmark} title="Agree" onSubmit={async () => await login(props.setLogin)} />
          <Action icon={Icon.ExclamationMark} title={"Start From Scratch"} onAction={resetRegistration} />
        </ActionPanel>
      }
    />
  );
}
