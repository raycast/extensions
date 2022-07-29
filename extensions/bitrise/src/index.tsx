import {
  ActionPanel,
  Color,
  CopyToClipboardAction,
  getPreferenceValues,
  Icon,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  ImageLike,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

export default function BuildList() {
  const [state, setState] = useState<{ builds: Build[] }>({ builds: [] });

  useEffect(() => {
    async function fetch() {
      const builds = await fetchBuilds();
      setState((oldState) => ({
        ...oldState,
        builds: builds,
      }));
    }
    fetch();
  }, []);

  return (
    <List isLoading={state.builds.length === 0} searchBarPlaceholder="Filter builds by branch...">
      {state.builds.map((build) => (
        <BuildListItem key={build.slug} build={build} />
      ))}
    </List>
  );
}

function BuildListItem(props: { build: Build }) {
  const build = props.build;

  return (
    <List.Item
      id={build.slug}
      key={build.slug}
      title={getTitle(build)}
      subtitle={build.triggered_workflow}
      icon={build.repository.avatar_url}
      accessoryTitle={getAccessoryTitle(build)}
      accessoryIcon={getAccessoryIcon(build)}
      actions={getActions(build)}
    />
  );
}

async function fetchBuilds(): Promise<Build[]> {
  try {
    const apiKey = getPreferenceValues().apiKey;
    const response = await fetch("https://api.bitrise.io/v0.1/builds", {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
    });
    const json = await response.json();
    return (json as Record<string, unknown>).data as Build[];
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, `Could not load builds due to ${error}`);
    return Promise.resolve([]);
  }
}

function getTitle(build: Build): string {
  if (!build.pull_request_target_branch) {
    return truncate(build.branch, 40);
  } else {
    return `${truncate(build.branch, 40)} -> ${truncate(build.pull_request_target_branch, 20)}`;
  }
}

function getAccessoryTitle(build: Build): string {
  const triggeredAt = new Date(build.triggered_at).toLocaleString();
  const startedOnWorkerAt = new Date(build.started_on_worker_at).toLocaleString();
  const finishedAt = new Date(build.finished_at).toLocaleString();
  if (build.is_on_hold) {
    return `triggered at ${triggeredAt}`;
  } else if (build.status === 0) {
    return `running since ${startedOnWorkerAt}`;
  } else if (build.status === 1) {
    return `finished at ${finishedAt}`;
  } else if (build.status === 2) {
    return `failed at ${finishedAt}`;
  } else if (build.status === 3) {
    return `aborted at ${finishedAt}`;
  } else if (build.status === 4) {
    return `aborted at ${finishedAt}`;
  } else {
    return `unknown build status: ${build.status}`;
  }
}

function getAccessoryIcon(build: Build): ImageLike {
  if (build.is_on_hold) {
    return { source: Icon.Clock };
  } else if (build.status === 0) {
    return { source: Icon.Gear, tintColor: Color.Magenta };
  } else if (build.status === 1) {
    return { source: Icon.Checkmark, tintColor: Color.Green };
  } else if (build.status === 2) {
    return { source: Icon.ExclamationMark, tintColor: Color.Red };
  } else if (build.status === 3) {
    return { source: Icon.Trash, tintColor: Color.Yellow };
  } else {
    return { source: Icon.QuestionMark, tintColor: Color.Orange };
  }
}

function getActions(build: Build) {
  const buildUrl = `https://app.bitrise.io/build/${build.slug}`;

  if (!build.pull_request_view_url) {
    return (
      <ActionPanel>
        <OpenInBrowserAction title="Open Build" url={buildUrl} />
        <CopyToClipboardAction title="Copy build URL" content={buildUrl} />
      </ActionPanel>
    );
  } else {
    return (
      <ActionPanel>
        <OpenInBrowserAction title="Open Build" url={buildUrl} />
        <CopyToClipboardAction title="Copy Build URL" content={buildUrl} />
        <OpenInBrowserAction title="Open PR" url={build.pull_request_view_url} />
        <CopyToClipboardAction title="Copy PR URL" content={build.pull_request_view_url} />
      </ActionPanel>
    );
  }
}

function truncate(str: string, n: number) {
  return str.length > n ? str.substr(0, n - 1) + "..." : str;
}

interface Preferences {
  apiKey: string;
}

type Build = {
  triggered_at: string;
  started_on_worker_at: string;
  finished_at: string;
  status: number;
  abort_reason: string;
  is_on_hold: boolean;
  slug: string;
  build_number: number;
  branch: string;
  triggered_workflow: string;
  pull_request_id: number;
  pull_request_view_url: string;
  pull_request_target_branch: string;
  repository: Repository;
};

type Repository = {
  title: string;
  repo_owner: string;
  avatar_url: string;
};
