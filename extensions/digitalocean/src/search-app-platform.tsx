import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { App, AppDeploymentPhase, useAppDeployments, useApps } from "./client";
import { DO } from "./config";

export default function Command() {
  const { data, error, isLoading } = useApps();
  const apps = data?.apps || [];

  if (error) {
    return <Detail markdown={`Failed to list apps: ${error.message}`} />;
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && !apps.length && (
        <List.EmptyView
          icon={DO.LOGO}
          title="Build and deploy apps from code to production in just a few clicks"
          description="Create your first app now"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={DO.ICON} title="Create App" url={DO.LINKS.apps.new} />
            </ActionPanel>
          }
        />
      )}
      {apps.map((app) => (
        <List.Item
          key={app.id}
          icon={{ source: Icon.Dot, tintColor: app.live_url ? Color.Green : Color.Blue }}
          title={app.spec.name}
          subtitle={app.live_url}
          accessories={[{ tag: app.tier_slug }, { date: new Date(app.created_at) }]}
          actions={
            <ActionPanel>
              {app.live_url && <Action.OpenInBrowser title="Visit Live URL" url={app.live_url} />}
              <Action.Push icon={Icon.Eye} title="View Deployments" target={<AppDeploymentsList app={app} />} />
              <Action.Push icon={Icon.MagnifyingGlass} title="Manage Env Vars" target={<AppEnvsList app={app} />} />
              <Action.OpenInBrowser url={`https://cloud.digitalocean.com/apps/${app.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function AppDeploymentsList({ app }: { app: App }) {
  const { data, error, isLoading } = useAppDeployments(app.id);

  function getDeploymentColor(phase: AppDeploymentPhase) {
    switch (phase) {
      case "ACTIVE":
        return Color.Green;
      case "ERROR":
        return Color.Red;
      default:
        return undefined;
    }
  }

  if (error) {
    return <Detail markdown={`Failed to list app deployments: ${error.message}`} />;
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title={`Apps / ${app.spec.name} / Deployments`}>
        {data?.deployments.map((deployment) => {
          const userAction = deployment.cause_details?.digitalocean_user_action;
          const user = userAction?.user;
          const full_name = user?.full_name || "System";
          let title = `${full_name}'s deployment `;
          if (deployment.phase === "ACTIVE") title += "went live";
          return (
            <List.Item
              key={deployment.id}
              icon={{ source: Icon.Dot, tintColor: getDeploymentColor(deployment.phase) }}
              title={title}
              subtitle={userAction?.name || "Unknown action"}
              accessories={[
                { tag: { value: deployment.phase, color: getDeploymentColor(deployment.phase) } },
                { date: new Date(deployment.updated_at) },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={`https://cloud.digitalocean.com/apps/${app.id}/deployments/${deployment.id}`}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function AppEnvsList({ app }: { app: App }) {
  return (
    <List isShowingDetail>
      <List.Section title={`Apps / ${app.spec.name} / Env Vars`}>
        {app.spec.envs?.map((env, idx) => (
          <List.Item
            key={idx}
            icon={env.type === "SECRET" ? Icon.QuestionMark : Icon.MagnifyingGlass}
            title={env.key}
            detail={<List.Item.Detail markdown={env.value} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Key to Clipboard" content={env.key} />
                <Action.CopyToClipboard title="Copy Value to Clipboard" content={env.value} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
