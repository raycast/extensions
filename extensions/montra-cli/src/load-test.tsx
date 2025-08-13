import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import EnvDropdown from "./ui/EnvDropdown";
import { Environment, envToArg, runMontra } from "./utils/exec";

interface Values {
  environment: Environment;
  jobId: string;
  parallelJobs: string;
}

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <EnvDropdown />
      <Form.TextField id="jobId" title="Job ID" />
      <Form.TextField id="parallelJobs" title="Parallel Jobs" placeholder="e.g. 8" />
    </Form>
  );
}

async function submit(values: Values) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Running load test" });
  try {
    await runMontra([
      "load-test",
      ...envToArg(values.environment),
      "--job-id",
      values.jobId,
      "--parallel-jobs",
      values.parallelJobs,
    ]);
    toast.style = Toast.Style.Success;
    toast.title = "Load test finished";
  } catch (e: unknown) {
    toast.style = Toast.Style.Failure;
    toast.title = "Load test failed";
    toast.message = e instanceof Error ? e.message : undefined;
  }
}
