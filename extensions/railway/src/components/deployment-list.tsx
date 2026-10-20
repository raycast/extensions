import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { EnvironmentGQL, deploymentUrl, fetchDeployments } from "../railway";
import {
  defaultLogType,
  deploymentSubtitle,
  deploymentTitle,
  getStatusDisplay,
  isInProgress,
  statusIcon,
  usePollWhile,
} from "../utils";
import { ServiceContext } from "../cli";
import { CopyCliCommandSubmenu } from "./cli-actions";
import { DeploymentActions } from "./deployment-actions";
import { LogList } from "./log-list";

interface DeploymentListProps {
  project: { id: string; name: string };
  environment: EnvironmentGQL;
  service: { id: string; name: string };
  onChange?: () => void;
}

export function DeploymentList({ project, environment, service, onChange }: DeploymentListProps) {
  const {
    isLoading,
    data: deployments = [],
    revalidate,
  } = useCachedPromise(fetchDeployments, [project.id, environment.id, service.id]);

  usePollWhile(
    deployments.some((d) => isInProgress(d.status)),
    revalidate,
  );

  const context: ServiceContext = { projectId: project.id, environmentId: environment.id, serviceId: service.id };

  // Keep the service list behind this view in sync after redeploying or removing from here
  const refresh = () => {
    revalidate();
    onChange?.();
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${service.name} · ${environment.name}`}
      searchBarPlaceholder="Search deployments by commit, branch, or ID"
    >
      {!isLoading && deployments.length === 0 && (
        <List.EmptyView
          icon={Icon.Rocket}
          title="No Deployments"
          description={`${service.name} has not been deployed`}
        />
      )}
      {deployments.map((deployment) => {
        const status = getStatusDisplay(deployment.status);
        const createdAt = new Date(deployment.createdAt);
        const url = deploymentUrl(project.id, service.id, environment.id, deployment.id);

        return (
          <List.Item
            key={deployment.id}
            icon={{ value: statusIcon(deployment.status), tooltip: status.label }}
            title={deploymentTitle(deployment)}
            subtitle={deploymentSubtitle(deployment)}
            keywords={[
              deployment.id,
              deployment.meta?.commitHash,
              deployment.meta?.branch,
              deployment.meta?.commitAuthor,
            ].filter((k): k is string => Boolean(k))}
            accessories={[
              { tag: { value: status.label, color: status.color } },
              { date: createdAt, tooltip: createdAt.toLocaleString() },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="View Logs"
                    icon={Icon.Terminal}
                    target={
                      <LogList
                        context={context}
                        deployment={deployment}
                        serviceName={service.name}
                        dashboardUrl={url}
                        initialType={defaultLogType(deployment.status)}
                      />
                    }
                  />
                  <Action.OpenInBrowser title="Open in Railway" url={url} shortcut={Keyboard.Shortcut.Common.Open} />
                </ActionPanel.Section>
                <DeploymentActions
                  deployment={deployment}
                  serviceName={service.name}
                  environmentName={environment.name}
                  onChange={refresh}
                />
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Deployment ID"
                    content={deployment.id}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  {deployment.meta?.commitHash && (
                    <Action.CopyToClipboard title="Copy Commit Hash" content={deployment.meta.commitHash} />
                  )}
                  <CopyCliCommandSubmenu
                    context={context}
                    deploymentId={deployment.id}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
