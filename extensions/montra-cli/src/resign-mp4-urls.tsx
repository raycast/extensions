import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import EnvDropdown from "./ui/EnvDropdown";
import { Environment, envToArg, runMontra } from "./utils/exec";

interface Values {
  environment: Environment;
  dryRun?: boolean;
}

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Resign" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <EnvDropdown id="env" title="Environment" />
      <Form.Checkbox id="dryRun" label="Dry Run" />
    </Form>
  );
}

async function submit(values: Values) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Resigning MP4 URLs" });
  try {
    const args = ["resign-mp4-urls", ...envToArg(values.environment)];
    if (values.dryRun) args.push("--dry-run");
    await runMontra(args, { timeoutMs: 300000 });
    toast.style = Toast.Style.Success;
    toast.title = "Resigned";
  } catch (e: unknown) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to resign";
    toast.message = e instanceof Error ? e.message : undefined;
  }
}
