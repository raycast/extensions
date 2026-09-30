import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { fetchApps } from "./api/apps";
import { fetchBuilds } from "./api/builds";
import { App } from "./api/types";
import { BuildList } from "./components/BuildList";

export default function Command() {
  const { isLoading, data } = useCachedPromise(async () => await fetchApps(), [], { initialData: [] });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search apps">
      {data.map((appsByOwner) => (
        <List.Section title={appsByOwner.owner.name} key={appsByOwner.owner.slug}>
          {appsByOwner.apps.map((app) => (
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

function BuildsByApp(props: { appSlug: string }) {
  const { data, isLoading } = usePromise(async (slug) => await fetchBuilds(slug), [props.appSlug]);

  return <BuildList builds={data} isLoading={isLoading} displayRepoTitle={false} />;
}

function appURL(app: App) {
  return `https://app.bitrise.io/app/${app.slug}`;
}
