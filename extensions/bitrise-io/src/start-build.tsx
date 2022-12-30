import { Form, showToast, Toast, Action, Icon, ActionPanel, open, Clipboard } from "@raycast/api";
import { App, AppSlug } from "./api/types";
import { useEffect, useState } from "react";
import { fetchApps } from "./api/apps";
import { fetchWorkflows } from "./api/workflows";
import { startBuild } from "./api/builds";

interface FormValues {
  appSlug: string;
  workflow: string;
  branch?: string;
  message?: string;
}

interface State {
  apps?: App[];
  workflows?: string[];
  isLoading: boolean;
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({ isLoading: false });
  const [appSlug, setAppSlug] = useState<AppSlug | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        setState((previous) => ({ ...previous, isLoading: true }));
        const apps = await fetchApps();
        const appList = Array.from(apps.apps.values()).flat();
        setState({ apps: appList, isLoading: false });
      } catch (error) {
        setState(() => ({
          isLoading: false,
          error: error instanceof Error ? error : new Error("Something went wrong"),
        }));
      }
    }
    fetch();
  }, []);

  useEffect(() => {
    async function fetch() {
      if (!appSlug) return;
      try {
        setState((previous) => ({ ...previous, isLoading: true }));
        const workflows = await fetchWorkflows(appSlug);
        setState((previous) => ({ ...previous, isLoading: false, workflows: workflows }));
      } catch (error) {
        setState(() => ({
          isLoading: false,
          error: error instanceof Error ? error : new Error("Something went wrong"),
        }));
      }
    }
    fetch();
  }, [appSlug]);

  return (
    <Form
      isLoading={state.isLoading}
      actions={
        <ActionPanel>
          <StartBuildAction />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="appSlug" title="App" value={appSlug ?? undefined} onChange={setAppSlug}>
        {state.apps?.map((app) => (
          <Form.Dropdown.Item value={app.slug} title={app.title} key={app.slug} icon={app.avatar_url ?? Icon.Box} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="workflow" title="Workflow" storeValue>
        {state.workflows?.map((workflow) => (
          <Form.Dropdown.Item value={workflow} title={workflow} key={workflow} />
        ))}
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

    if (!values.workflow) {
      await showSubmitError("Invalid parameters", "No workflow selected");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting build",
    });

    const response = await startBuild(values.appSlug, {
      workflow_id: values.workflow,
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
