import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchApps } from "./api/apps";
import { fetchBuilds } from "./api/builds";
import { AppsByOwner, BuildsByStatus, App } from "./api/types";
import { BuildList } from "./components/BuildList";
import { handleError } from "./util/error";

interface State {
  apps: AppsByOwner;
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({
    apps: { apps: new Map(), owners: new Map() },
  });

  useEffect(() => {
    async function fetch() {
      try {
        const apps = await fetchApps();
        setState({ apps: apps });
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error: error instanceof Error ? error : new Error("Something went wrong"),
        }));
      }
    }
    fetch();
  }, []);

  if (state.error) {
    handleError(state.error);
  }

  return (
    <List isLoading={state.apps.apps.size == 0 && !state.error} searchBarPlaceholder="Search apps">
      {[...state.apps.apps.entries()].map((entry) => (
        <List.Section title={state.apps.owners.get(entry[0])?.name} key={entry[0]}>
          {entry[1].map((app) => (
            <AppListItem app={app} key={app.slug} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function AppListItem(props: { app: App }) {
  return (
    <List.Item
      icon={props.app.avatar_url ?? Icon.Box}
      title={props.app.title}
      actions={
        <ActionPanel title={props.app.title}>
          <Action.Push
            title="Show builds"
            icon={Icon.AppWindowList}
            target={<BuildsByApp appSlug={props.app.slug} />}
          />
          <ActionPanel.Section>
            <Action.OpenInBrowser url={appURL(props.app)} />
            <Action.OpenInBrowser url={props.app.repo_url} title="Open Repository in Browser" />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy App URL" content={appURL(props.app)} />
            <Action.CopyToClipboard title="Copy Repository URL" content={props.app.repo_url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface BuildsState {
  builds?: BuildsByStatus;
  error?: Error;
}

function BuildsByApp(props: { appSlug: string }) {
  const [state, setState] = useState<BuildsState>({});

  useEffect(() => {
    async function fetch() {
      try {
        const builds = await fetchBuilds(props.appSlug);
        setState({ builds: builds });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }
    fetch();
  }, [props.appSlug]);

  if (state.error) {
    handleError(state.error);
  }

  return <BuildList builds={state.builds} isLoading={!state.builds && !state.error} displayRepoTitle={false} />;
}

function appURL(app: App) {
  return `https://app.bitrise.io/app/${app.slug}`;
}
