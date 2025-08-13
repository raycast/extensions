import { Action, ActionPanel, Form, Toast, showToast, popToRoot } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import EnvDropdown from "./ui/EnvDropdown";
import { Environment, envToArg, runMontra } from "./utils/exec";

interface Values {
  environment: Environment;
  email?: string;
  code?: string;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit: submit,
    validation: {
      environment: FormValidation.Required,
      email: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Auth: Login"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Login" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <EnvDropdown />
      <Form.TextField title="Email" placeholder="[email protected]" {...itemProps.email} />
      <Form.TextField title="Code" placeholder="Optional one-time code" {...itemProps.code} />
    </Form>
  );
}

async function submit(values: Values) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Logging in" });
  try {
    const args = ["auth", "login", ...envToArg(values.environment)];
    if (values.email) args.push("--email", values.email);
    if (values.code) args.push("--code", values.code);
    await runMontra(args, { timeoutMs: 120000 });
    toast.style = Toast.Style.Success;
    toast.title = "Logged in";
    await popToRoot();
  } catch (e: unknown) {
    toast.style = Toast.Style.Failure;
    toast.title = "Login failed";
    toast.message = e instanceof Error ? e.message : undefined;
  }
}
