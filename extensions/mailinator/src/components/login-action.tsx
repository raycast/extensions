import { Action } from "@raycast/api";
import { ApiForm } from "./api-form";

export function LoginAction({ setToken }: { setToken: (token: string) => void }) {
  return (
    <Action.Push
      title="Sign in at Mailinator Using Your Token"
      target={<ApiForm onSubmit={(values) => setToken(values.token)} />}
    />
  );
}
