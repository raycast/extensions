import { useState } from "react";
import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  EnvironmentGQL,
  ServiceInstanceGQL,
  deployLatestSource,
  deploymentUrl,
  fetchEnvironments,
  fetchServiceInstances,
  projectUrl,
  serviceUrl,
} from "../railway";
import { ServiceContext } from "../cli";
import { defaultLogType, getStatusDisplay, isInProgress, usePollWhile } from "../utils";
import { CopyCliCommandSubmenu } from "./cli-actions";
import { DeploymentActions, runDeploymentAction } from "./deployment-actions";
import { DeploymentList } from "./deployment-list";
import { DomainList } from "./domain-list";
import { LogList } from "./log-list";
import { MetricsView } from "./metrics-view";
import { VariableList } from "./variable-list";

interface Project {
  id: string;
  name: string;
}

export function ServiceList({ project }: { project: Project }) {
  const [environmentId, setEnvironmentId] = useState<string>();

  const { isLoading: isLoadingEnvironments, data: environments = [] } = useCachedPromise(fetchEnvironments, [
    project.id,
  ]);
  const environment = environments.find((e) => e.id === environmentId) ?? environments[0];

  const {
    isLoading: isLoadingServices,
    data: services,
    revalidate,
  } = useCachedPromise(fetchServiceInstances, [project.id, environment?.id ?? ""], {
    execute: Boolean(environment),
  });

  usePollWhile(
    Boolean(services?.some((s) => s.latestDeployment && isInProgress(s.latestDeployment.status))),
    revalidate,
  );

  return (
    <List
      isLoading={isLoadingEnvironments || isLoadingServices}
      navigationTitle={environment ? `${project.name} · ${environment.name}` : project.name}
      searchBarPlaceholder="Search services"
      searchBarAccessory={
        <List.Dropdown tooltip="Select Environment" value={environment?.id} onChange={setEnvironmentId}>
          {environments.map((e) => (
            <List.Dropdown.Item key={e.id} title={e.name} value={e.id} icon={Icon.Layers} />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoadingEnvironments && !isLoadingServices && (!environment || services?.length === 0) && (
        <List.EmptyView
          icon={Icon.Box}
          title="No Services"
          description={environment ? `No services in ${environment.name}` : "This project has no environments"}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Project in Railway" url={projectUrl(project.id)} />
            </ActionPanel>
          }
        />
      )}
      {environment &&
        services?.map((service) => (
          <ServiceItem
            key={service.id}
            project={project}
            environment={environment}
            service={service}
            onChange={revalidate}
          />
        ))}
    </List>
  );
}

interface ServiceItemProps {
  project: Project;
  environment: EnvironmentGQL;
  service: ServiceInstanceGQL;
  onChange: () => void;
}

function ServiceItem({ project, environment, service, onChange }: ServiceItemProps) {
  const deployment = service.latestDeployment;
  const domain = service.domains.customDomains[0]?.domain ?? service.domains.serviceDomains[0]?.domain;
  const source = service.source?.repo ?? service.source?.image ?? undefined;
  const dashboardUrl = serviceUrl(project.id, service.serviceId, environment.id);
  const context: ServiceContext = {
    projectId: project.id,
    environmentId: environment.id,
    serviceId: service.serviceId,
  };

  const accessories: List.Item.Accessory[] = [];
  if (service.cronSchedule) {
    accessories.push({ icon: Icon.Calendar, tooltip: `Cron: ${service.cronSchedule}` });
  }
  if (service.numReplicas && service.numReplicas > 1) {
    accessories.push({ icon: Icon.Layers, text: `${service.numReplicas}`, tooltip: `${service.numReplicas} replicas` });
  }
  if (deployment) {
    const status = getStatusDisplay(deployment.status);
    const createdAt = new Date(deployment.createdAt);
    accessories.push(
      { tag: { value: status.label, color: status.color } },
      { date: createdAt, tooltip: `Deployed ${createdAt.toLocaleString()}` },
    );
  } else {
    accessories.push({ tag: { value: "Not Deployed", color: Color.SecondaryText } });
  }

  return (
    <List.Item
      icon={service.service.icon ? { source: service.service.icon, fallback: Icon.Box } : Icon.Box}
      title={service.serviceName}
      subtitle={domain ?? source}
      keywords={[domain, source].filter((k): k is string => Boolean(k))}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {deployment && (
              <Action.Push
                title="View Logs"
                icon={Icon.Terminal}
                target={
                  <LogList
                    context={context}
                    deployment={deployment}
                    serviceName={service.serviceName}
                    dashboardUrl={deploymentUrl(project.id, service.serviceId, environment.id, deployment.id)}
                    initialType={defaultLogType(deployment.status)}
                  />
                }
              />
            )}
            <Action.Push
              title="View Deployments"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={
                <DeploymentList
                  project={project}
                  environment={environment}
                  service={{ id: service.serviceId, name: service.serviceName }}
                  onChange={onChange}
                />
              }
            />
            <Action.Push
              title="View Variables"
              icon={Icon.Key}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              target={
                <VariableList context={context} serviceName={service.serviceName} environmentName={environment.name} />
              }
            />
            <Action.Push
              title="View Domains"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              target={
                <DomainList
                  context={context}
                  serviceName={service.serviceName}
                  environmentName={environment.name}
                  onChange={onChange}
                />
              }
            />
            <Action.Push
              title="View Metrics"
              icon={Icon.LineChart}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              target={<MetricsView context={context} serviceName={service.serviceName} />}
            />
            <Action.OpenInBrowser title="Open in Railway" url={dashboardUrl} shortcut={Keyboard.Shortcut.Common.Open} />
            {domain && (
              <Action.OpenInBrowser
                title="Open Service URL"
                icon={Icon.Globe}
                url={`https://${domain}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
            )}
          </ActionPanel.Section>
          <DeploymentActions
            deployment={deployment}
            serviceName={service.serviceName}
            environmentName={environment.name}
            onChange={onChange}
          >
            {source && (
              <Action
                title={service.source?.repo ? "Deploy Latest Commit" : "Deploy Latest Image"}
                icon={Icon.Rocket}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={() =>
                  runDeploymentAction({
                    confirm: {
                      title: `Deploy ${service.serviceName}?`,
                      message: `Pull the latest ${
                        service.source?.repo ? "commit" : "image"
                      } from ${source} and deploy it to ${environment.name}.`,
                      primaryAction: { title: "Deploy" },
                    },
                    progressTitle: `Deploying ${service.serviceName}`,
                    successTitle: `Triggered a deploy of ${service.serviceName}`,
                    failureTitle: `Failed to deploy ${service.serviceName}`,
                    run: () => deployLatestSource(environment.id, service.serviceId),
                    onDone: () => {
                      onChange();
                      // The mutation only returns a boolean, so the new deployment shows up a moment later
                      setTimeout(onChange, 3000);
                    },
                  })
                }
              />
            )}
          </DeploymentActions>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Service URL"
              content={dashboardUrl}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard title="Copy Service ID" content={service.serviceId} />
            <CopyCliCommandSubmenu context={context} shortcut={{ modifiers: ["cmd", "opt"], key: "c" }} />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onChange}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
