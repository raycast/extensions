import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import EnvDropdown from "./ui/EnvDropdown";
import { Environment, envToArg, runMontra } from "./utils/exec";

interface Values {
  environment: Environment;
  email: string;
  openInBrowser?: boolean;
}

export default function Command() {
  return (
    <Form
      navigationTitle="Impersonate User"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Impersonate" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <EnvDropdown />
      <Form.TextField id="email" title="Email" placeholder="[email protected]" />
      <Form.Checkbox id="openInBrowser" label="Open in browser" />
    </Form>
  );
}

async function submit(values: Values) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Impersonating" });
  try {
    const args = ["impersonate", ...envToArg(values.environment), "--email", values.email];
    if (values.openInBrowser) args.push("--open-in-browser");
    await runMontra(args, { timeoutMs: 120000 });
    toast.style = Toast.Style.Success;
    toast.title = "Impersonated";
  } catch (e: unknown) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to impersonate";
    toast.message = e instanceof Error ? e.message : undefined;
  }
}
