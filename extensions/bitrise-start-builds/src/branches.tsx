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
import { WorkflowList } from "./workflows";

export function BranchesList(props: { appSlug: string }) {
  const [state, setState] = useState<{ branches: string[] }>({ branches: [] });

  useEffect(() => {
    async function fetch() {
      const branches = await fetchBranches(props.appSlug);
      setState((oldState) => ({
        ...oldState,
        branches: branches,
      }));
    }
    fetch();
  }, []);

  return (
    <List isLoading={state.branches.length === 0} searchBarPlaceholder="Filter branches by name...">
      {state.branches.map((branch) => (
        <BranchListItem key={branch} branch={branch} appSlug={props.appSlug} />
      ))}
    </List>
  );
}

function BranchListItem(props: { branch: string; appSlug: string }) {
  const branch = props.branch;
  const appSlug = props.appSlug;

  return (
    <List.Item
      id={branch}
      key={branch}
      title={branch}
      subtitle=""
      actions={
        <ActionPanel>
          <Action.Push title="Select Branch" target={<WorkflowList appSlug={appSlug} branch={branch} />} />
        </ActionPanel>
      }
    />
  );
}

async function fetchBranches(appSlug: string): Promise<string[]> {
  try {
    const apiKey = getPreferenceValues().apiKey;
    const response = await fetch(`https://api.bitrise.io/v0.1/apps/${appSlug}/branches`, {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
    });
    const json = await response.json();
    return (json as Record<string, unknown>).data as string[];
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, `Could not load branches due to ${error}`);
    return Promise.resolve([]);
  }
}
