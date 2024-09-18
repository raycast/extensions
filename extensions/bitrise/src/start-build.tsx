import { Form, showToast, Toast, Action, Icon, ActionPanel, open, Clipboard } from "@raycast/api";
import { AppSlug } from "./api/types";
import { useState } from "react";
import { fetchApps } from "./api/apps";
import { fetchWorkflows } from "./api/workflows";
import { startBuild } from "./api/builds";
import { useCachedPromise, usePromise } from "@raycast/utils";

interface FormValues {
  appSlug: string;
  workflow_or_pipeline: string;
  branch?: string;
  message?: string;
}

export default function Command() {
  const [appSlug, setAppSlug] = useState<AppSlug | null>(null);

  const appsState = useCachedPromise(
    async () => {
      const apps = await fetchApps();
      return apps.map((appsByOwner) => appsByOwner.apps).flat();
    },
    [],
    { initialData: [] }
  );

  const workflowsState = usePromise(
    async (appSlug) => {
      if (!appSlug) return;
      return await fetchWorkflows(appSlug);
    },
    [appSlug]
  );

  return (
    <Form
      isLoading={workflowsState.isLoading || appsState.isLoading}
      actions={
        <ActionPanel>
          <StartBuildAction />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="appSlug" title="App" value={appSlug ?? undefined} onChange={setAppSlug}>
        {appsState.data.map((app) => (
          <Form.Dropdown.Item value={app.slug} title={app.title} key={app.slug} icon={app.avatar_url ?? Icon.Box} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="workflow_or_pipeline" title="Workflow" storeValue>
        <Form.Dropdown.Section title="Pipelines">
          {workflowsState.data?.active_pipelines?.map((pipeline) => (
            <Form.Dropdown.Item value={"++pipeline++" + pipeline.name} title={pipeline.name} key={pipeline.name} />
          ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Workflows">
          {workflowsState.data?.active_workflows?.map((workflow) => (
            <Form.Dropdown.Item value={workflow.name} title={workflow.name} key={workflow.name} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.TextField id="branch" title="Branch" placeholder="Enter git branch (optional)" />
      <Form.TextArea id="message" title="Message" placeholder="Enter message (optional)" />
    </Form>
  );
}

function StartBuildAction() {
  async function handleSubmit(values: Partial<FormValues>) {
    if (!values.appSlug) {
      await showSubmitError("Invalid parameters", "No app selected");
      return;
    }

    if (!values.workflow_or_pipeline) {
      await showSubmitError("Invalid parameters", "No workflow selected");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting build",
    });

    let pipeline_id: string | undefined;
    let workflow_id: string | undefined;
    if (values.workflow_or_pipeline.startsWith("++pipeline++")) {
      pipeline_id = values.workflow_or_pipeline.split("++pipeline++")[1];
      workflow_id = undefined;
    } else {
      pipeline_id = undefined;
      workflow_id = values.workflow_or_pipeline;
    }

    const response = await startBuild(values.appSlug, {
      pipeline_id: pipeline_id,
      workflow_id: workflow_id,
      branch: values.branch,
      commit_message: values.message,
    });

    toast.style = Toast.Style.Success;
    toast.title = `Build #${response.build_number} started`;
    toast.primaryAction = {
      title: "Open Build",
      onAction: async () => {
        await open(response.build_url);
      },
    };
    toast.secondaryAction = {
      title: "Copy Build URL",
      onAction: async () => {
        await Clipboard.copy(response.build_url);
      },
    };
  }

  return <Action.SubmitForm title="Start build" icon={Icon.Play} onSubmit={handleSubmit} />;
}

async function showSubmitError(title: string, message?: string) {
  showToast({
    style: Toast.Style.Failure,
    title: title,
    message: message,
  });
}
