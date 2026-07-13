import { Action, ActionPanel, Icon, Keyboard, LaunchProps, List } from "@raycast/api";
import { useMemo } from "react";
import { DokployClient } from "./api/client";
import { AccountDropdown } from "./components/account-dropdown";
import { DeploymentList } from "./components/deployment-list";
import { DeploymentLogs } from "./components/deployment-logs";
import { NoAccounts } from "./components/no-accounts";
import { useAccounts } from "./hooks/use-accounts";
import { DeploymentFeedItem, useAllDeployments } from "./hooks/use-deployments";
import { deploymentHeadline } from "./lib/format";
import { deploymentIcon, deploymentTag } from "./lib/status";
import { deploymentsUrl, serviceUrl } from "./lib/urls";
import { Deployment } from "./types/dokploy";
import { DeploymentsLaunchContext } from "./types/launch";

const FEED_LIMIT = 50;

export default function Deployments(props: LaunchProps<{ launchContext?: DeploymentsLaunchContext }>) {
  const {
    accounts,
    activeAccount,
    isLoading: accountsLoading,
    switchAccount,
    hasAccounts,
    reloadAccounts,
  } = useAccounts();
  const context = props.launchContext;

  const clients = useMemo(
    () => new Map(accounts.map((account) => [account.id, new DokployClient(account)])),
    [accounts],
  );

  const {
    data: feed,
    isLoading: feedLoading,
    revalidate,
  } = useAllDeployments(
    // With a service in hand there is no feed to load - the nested list fetches that service's
    // own history instead.
    context ? [] : accounts,
    FEED_LIMIT,
  );

  if (!accountsLoading && !hasAccounts) {
    return (
      <List>
        <NoAccounts onAccountAdded={reloadAccounts} />
      </List>
    );
  }

  // Launched from the menu bar for one specific service: go straight to its build history.
  if (context) {
    const client = clients.get(context.accountId);
    if (!client) {
      return (
        <List isLoading={accountsLoading}>
          <List.EmptyView
            icon={Icon.Plug}
            title="Account Not Found"
            description="The Dokploy account this service belongs to is no longer connected."
          />
        </List>
      );
    }
    return <DeploymentList client={client} service={context.service} />;
  }

  const showAccountNames = accounts.length > 1;

  return (
    <List
      isLoading={accountsLoading || feedLoading}
      searchBarPlaceholder="Search deployments…"
      searchBarAccessory={
        <AccountDropdown accounts={accounts} activeAccountId={activeAccount?.id} onChange={switchAccount} />
      }
    >
      <List.EmptyView
        icon={Icon.Rocket}
        title="No Deployments"
        description="Nothing has been deployed on the connected accounts yet."
      />

      {feed.map((item) => {
        const client = clients.get(item.accountId);
        if (!client) return null;

        const status = deploymentTag(item.status);

        return (
          <List.Item
            key={`${item.accountId}:${item.deploymentId}`}
            icon={deploymentIcon(item.status)}
            title={deploymentHeadline(item.title, 80)}
            subtitle={
              showAccountNames
                ? `${item.accountLabel} · ${item.service.projectName} / ${item.service.name}`
                : `${item.service.projectName} / ${item.service.name}`
            }
            keywords={[item.service.name, item.service.projectName, item.accountLabel]}
            accessories={[
              ...(item.errorMessage ? [{ icon: Icon.ExclamationMark, tooltip: item.errorMessage }] : []),
              { tag: status },
              ...(item.createdAt ? [{ date: new Date(item.createdAt) }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Build Log"
                  icon={Icon.Terminal}
                  target={
                    <DeploymentLogs client={client} deployment={toDeployment(item)} serviceName={item.service.name} />
                  }
                />
                <Action.Push
                  title="View Service Deployments"
                  icon={Icon.Clock}
                  target={<DeploymentList client={client} service={item.service} />}
                />
                <Action.OpenInBrowser
                  title="Open in Dokploy"
                  url={serviceUrl(client.webUrl, item.service)}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
                <Action.OpenInBrowser title="Open Deployments Dashboard" url={deploymentsUrl(client.webUrl)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

/** The feed carries a reduced deployment; the log view wants the full shape. */
function toDeployment(item: DeploymentFeedItem): Deployment {
  return {
    deploymentId: item.deploymentId,
    title: item.title,
    status: item.status,
    createdAt: item.createdAt,
    errorMessage: item.errorMessage,
  };
}
