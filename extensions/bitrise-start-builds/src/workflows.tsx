import {
  ActionPanel,
  Action,
  Detail,
  Color,
  CopyToClipboardAction,
  getPreferenceValues,
  Icon,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  ImageLike,
  useNavigation,
  Navigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { BuildStartedDetail } from "./build-started";

export function WorkflowList(props: { appSlug: string; branch: string }) {
  const [state, setState] = useState<{ workflows: string[] }>({ workflows: [] });

  useEffect(() => {
    async function fetch() {
      const workflows = await fetchWorkflows(props.appSlug);
      setState((oldState) => ({
        ...oldState,
        workflows: workflows,
      }));
    }
    fetch();
  }, []);

  return (
    <List isLoading={state.workflows.length === 0} searchBarPlaceholder="Filter workflows by name...">
      {state.workflows.map((workflow) => (
        <WorkflowListItem key={workflow} workflow={workflow} branch={props.branch} appSlug={props.appSlug} />
      ))}
    </List>
  );
}

function WorkflowListItem(props: { branch: string; workflow: string; appSlug: string }) {
  const workflow = props.workflow;
  const branch = props.branch;
  const appSlug = props.appSlug;
  const navigation = useNavigation();

  return (
    <List.Item
      id={workflow}
      key={workflow}
      title={workflow}
      subtitle=""
      actions={
        <ActionPanel>
          <Action title="Start Build" onAction={() => startBuild(navigation, appSlug, branch, workflow)} />
        </ActionPanel>
      }
    />
  );
}

async function fetchWorkflows(appSlug: string): Promise<string[]> {
  try {
    const apiKey = getPreferenceValues().apiKey;
    const response = await fetch(`https://api.bitrise.io/v0.1/apps/${appSlug}/build-workflows`, {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
    });
    const json = await response.json();
    return (json as Record<string, unknown>).data as string[];
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, `Could not load workflows due to ${error}`);
    return Promise.resolve([]);
  }
}

async function startBuild(navigation: Navigation, appSlug: string, branch: string, workflow: string) {
  const buildStarted = await postBuild(appSlug, branch, workflow);
  if (buildStarted != null) {
    navigation.push(<BuildStartedDetail buildStarted={buildStarted} />);
  }
}

async function postBuild(appSlug: string, branch: string, workflow: string): Promise<BuildStarted | null> {
  try {
    const apiKey = getPreferenceValues().apiKey;
    const body = JSON.stringify({
      hook_info: {
        type: "bitrise",
      },
      build_params: {
        branch: branch,
        workflow_id: workflow,
      },
    });
    const response = await fetch(`https://api.bitrise.io/v0.1/apps/${appSlug}/builds`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
      },
      body: body,
    });
    const json = await response.json();
    return json as Record<string, unknown> as BuildStarted;
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, `Could not start build due to ${error}`);
    return Promise.resolve(null);
  }
}

export type BuildStarted = {
  status: string;
  build_url: string;
  build_number: string;
  avatar_url: string;
};
