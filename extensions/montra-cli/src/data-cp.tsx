import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import EnvDropdown from "./ui/EnvDropdown";
import { Environment, runMontra } from "./utils/exec";

interface Values {
  origin: Environment;
  target: Environment;
  mediaSyncId: string;
}

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <EnvDropdown id="origin" title="Origin Env" />
      <EnvDropdown id="target" title="Target Env" />
      <Form.TextField id="mediaSyncId" title="Media Sync ID" placeholder="e.g. 42" />
    </Form>
  );
}

async function submit(values: Values) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Copying media sync" });
  try {
    const { stdout } = await runMontra(["data", "cp", values.origin, values.target, values.mediaSyncId], {
      timeoutMs: 300000,
    });
    toast.style = Toast.Style.Success;
    toast.title = "Copy completed";
    console.log(stdout);
  } catch (e: unknown) {
    toast.style = Toast.Style.Failure;
    toast.title = "Copy failed";
    toast.message = e instanceof Error ? e.message : undefined;
  }
}
