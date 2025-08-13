import { Action, ActionPanel, Form, Toast, showToast, popToRoot } from "@raycast/api";
import EnvDropdown from "./ui/EnvDropdown";
import { Environment, envToArg, runMontra } from "./utils/exec";

interface Values {
  environment: Environment;
}

export default function Command() {
  return (
    <Form
      navigationTitle="Auth: Logout"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Logout" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <EnvDropdown />
    </Form>
  );
}

async function submit(values: Values) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Logging out" });
  try {
    await runMontra(["auth", "logout", ...envToArg(values.environment)]);
    toast.style = Toast.Style.Success;
    toast.title = "Logged out";
    await popToRoot();
  } catch (e: unknown) {
    toast.style = Toast.Style.Failure;
    toast.title = "Logout failed";
    toast.message = e instanceof Error ? e.message : undefined;
  }
}
