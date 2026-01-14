import {
  ActionPanel,
  Detail,
  Icon,
  List,
  showToast,
  Action,
  Toast,
} from '@raycast/api';
import { useMemo } from 'react';
import Service, {
  AuthError,
  DeployResponse,
  NetworkError,
  ServiceResponse,
} from './service';
import {
  getCommitUrl,
  getDeployStatusIcon,
  getDeployUrl,
  getKey,
  getServiceUrl,
  formatDate,
  formatDeployStatus,
  formatServiceType,
  formatCommit,
  getDomainIcon,
  getServiceIcon,
} from './utils';
import { useCachedPromise, useLocalStorage } from '@raycast/utils';

const renderService = new Service(getKey());

export default function Command() {
  const {
    value: pinnedIds,
    setValue: setPinnedIds,
    isLoading: isLoadingPinned,
  } = useLocalStorage<string[]>('pinned-services', []);

  async function pinService(serviceId: string) {
    const current = pinnedIds ?? [];
    if (!current.includes(serviceId)) {
      await setPinnedIds([serviceId, ...current]);
    }
  }

  async function unpinService(serviceId: string) {
    const current = pinnedIds ?? [];
    await setPinnedIds(current.filter((id) => id !== serviceId));
  }

  const { isLoading: isLoadingOwners, data: owners } = useCachedPromise(
    async () => {
      const owners = await renderService.getOwners();
      return owners;
    },
    [],
    {
      onError(error) {
        handleError(error);
      },
      initialData: [],
      keepPreviousData: true,
    },
  );
  const { isLoading: isLoadingServices, data: services } = useCachedPromise(
    async () => {
      const services = await renderService.getServices();
      return services;
    },
    [],
    {
      onError(error) {
        handleError(error);
      },
      initialData: [],
      keepPreviousData: true,
    },
  );
  const isLoading = isLoadingOwners || isLoadingServices || isLoadingPinned;

  const pinnedServices = useMemo(() => {
    if (!pinnedIds || !services.length) return [];
    return pinnedIds
      .map((id) => services.find((s) => s.id === id))
      .filter((s): s is ServiceResponse => s !== undefined);
  }, [pinnedIds, services]);

  const pinnedIdSet = useMemo(() => new Set(pinnedIds ?? []), [pinnedIds]);

  const serviceMap = useMemo(() => {
    const map: Record<string, ServiceResponse[]> = {};
    for (const service of services) {
      if (pinnedIdSet.has(service.id)) continue; // Exclude pinned services
      const { ownerId } = service;
      if (!map[ownerId]) {
        map[ownerId] = [];
      }
      map[ownerId].push(service);
    }
    return map;
  }, [services, pinnedIdSet]);

  const ownerMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const owner of owners) {
      const { id, name } = owner;
      if (map[id]) {
        continue;
      }
      map[id] = name;
    }
    return map;
  }, [owners]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search service">
      {pinnedServices.length > 0 && (
        <List.Section key="pinned" title="Pinned">
          {pinnedServices.map((service) => (
            <List.Item
              key={service.id}
              icon={getServiceIcon(service)}
              title={service.name}
              subtitle={formatServiceType(service)}
              accessories={[
                { icon: Icon.Pin },
                { date: new Date(service.updatedAt) },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.BlankDocument}
                    title="Show Details"
                    target={<ServiceView service={service} />}
                  />
                  <Action.Push
                    icon={Icon.Hammer}
                    title="Show Deploys"
                    target={<DeployListView service={service} />}
                    shortcut={{ modifiers: ['cmd'], key: 'd' }}
                  />
                  <Action.OpenInBrowser
                    title="Open in Render"
                    url={getServiceUrl(service)}
                    shortcut={{ modifiers: ['cmd'], key: 'r' }}
                  />
                  <Action.OpenInBrowser
                    title="Open Repo"
                    url={service.repo}
                    shortcut={{ modifiers: ['cmd'], key: 'g' }}
                  />
                  <Action
                    icon={Icon.PinDisabled}
                    title="Unpin Service"
                    shortcut={{ modifiers: ['cmd', 'shift'], key: 'p' }}
                    onAction={() => unpinService(service.id)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {Object.keys(ownerMap).map((owner) => (
        <List.Section key={owner} title={ownerMap[owner]}>
          {serviceMap[owner] &&
            serviceMap[owner].map((service) => (
              <List.Item
                key={service.id}
                icon={getServiceIcon(service)}
                title={service.name}
                subtitle={formatServiceType(service)}
                accessories={[{ date: new Date(service.updatedAt) }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      icon={Icon.BlankDocument}
                      title="Show Details"
                      target={<ServiceView service={service} />}
                    />
                    <Action.Push
                      icon={Icon.Hammer}
                      title="Show Deploys"
                      target={<DeployListView service={service} />}
                      shortcut={{ modifiers: ['cmd'], key: 'd' }}
                    />
                    <Action.OpenInBrowser
                      title="Open in Render"
                      url={getServiceUrl(service)}
                      shortcut={{ modifiers: ['cmd'], key: 'r' }}
                    />
                    <Action.OpenInBrowser
                      title="Open Repo"
                      url={service.repo}
                      shortcut={{ modifiers: ['cmd'], key: 'g' }}
                    />
                    <Action
                      icon={Icon.Pin}
                      title="Pin Service"
                      shortcut={{ modifiers: ['cmd', 'shift'], key: 'p' }}
                      onAction={() => pinService(service.id)}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

interface ServiceProps {
  service: ServiceResponse;
}

function ServiceView(props: ServiceProps) {
  const { service } = props;

  const navigationTitle = `Service: ${service.name}`;

  const typeString = formatServiceType(service);
  const environment =
    service.type !== 'static_site' ? service.serviceDetails.env : null;
  const schedule =
    service.type === 'cron_job' ? service.serviceDetails.schedule : null;
  const runDate =
    service.type === 'cron_job' && service.serviceDetails.lastSuccessfulRunAt
      ? new Date(service.serviceDetails.lastSuccessfulRunAt)
      : null;
  const updateDate = new Date(service.updatedAt);

  const environmentString = environment
    ? `**Environment**: ${environment}`
    : '';
  const scheduleString = schedule ? `**Schedule**: ${schedule}` : '';
  const lastRunString = runDate ? `**Last run**: ${formatDate(runDate)}` : '';
  const lastUpdateString = `**Last update**: ${formatDate(updateDate)}`;

  const markdown = `
  # ${service.name}

  *${typeString}*

  ${environmentString}

  ${scheduleString}

  ${lastRunString}

  ${lastUpdateString}
  `;

  return (
    <Detail
      navigationTitle={navigationTitle}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Hammer}
            title="Show Deploys"
            target={<DeployListView service={service} />}
          />
          <Action.Push
            icon={Icon.Text}
            title="Show Environment Variables"
            target={
              <EnvVariableListView
                serviceId={service.id}
                serviceName={service.name}
              />
            }
            shortcut={{ modifiers: ['cmd'], key: 'e' }}
          />
          <Action.Push
            icon={Icon.Text}
            title="Show Custom Domains"
            target={
              <DomainListView
                serviceId={service.id}
                serviceName={service.name}
              />
            }
            shortcut={{ modifiers: ['cmd'], key: 'd' }}
          />
          <Action.OpenInBrowser
            title="Open in Render"
            url={getServiceUrl(service)}
            shortcut={{ modifiers: ['cmd'], key: 'r' }}
          />
          <Action.OpenInBrowser
            title="Open Repo"
            url={service.repo}
            shortcut={{ modifiers: ['cmd'], key: 'g' }}
          />
        </ActionPanel>
      }
    />
  );
}

interface ServiceProps {
  service: ServiceResponse;
}

function DeployListView(props: ServiceProps) {
  const { service } = props;

  const { isLoading, data: deploys } = useCachedPromise(
    async () => {
      const deploys = await renderService.getDeploys(service.id);
      return deploys;
    },
    [],
    {
      onError(error) {
        handleError(error);
      },
      initialData: [],
    },
  );

  const navigationTitle = `${service.name}: Deploys`;

  return (
    <List
      navigationTitle={navigationTitle}
      isLoading={isLoading}
      searchBarPlaceholder="Search deploy"
    >
      {deploys.map((deploy) => (
        <List.Item
          key={deploy.id}
          icon={getDeployStatusIcon(deploy.status)}
          title={formatCommit(deploy.commit.message)}
          accessories={[{ date: new Date(deploy.finishedAt) }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.BlankDocument}
                title="Show Details"
                target={<DeployView service={service} deploy={deploy} />}
              />
              <Action.OpenInBrowser
                title="Open in Render"
                url={getDeployUrl(service, deploy.id)}
                shortcut={{ modifiers: ['cmd'], key: 'r' }}
              />
              <Action.OpenInBrowser
                title="Open Commit"
                url={getCommitUrl(service.repo, deploy.commit.id)}
                shortcut={{ modifiers: ['cmd'], key: 'g' }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface DeployProps {
  service: ServiceResponse;
  deploy: DeployResponse;
}

function DeployView(props: DeployProps) {
  const { service, deploy } = props;

  const markdown = `
  # ${formatCommit(deploy.commit.message)}

  ${formatDate(new Date(deploy.finishedAt))}

  **Status**: ${formatDeployStatus(deploy.status)}
  `;

  return (
    <Detail
      navigationTitle="Deploy"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Render"
            url={getDeployUrl(service, deploy.id)}
            shortcut={{ modifiers: ['cmd'], key: 'r' }}
          />
          <Action.OpenInBrowser
            title="Open Commit"
            url={getCommitUrl(service.repo, deploy.commit.id)}
            shortcut={{ modifiers: ['cmd'], key: 'g' }}
          />
        </ActionPanel>
      }
    />
  );
}

interface EnvVariableListProps {
  serviceId: string;
  serviceName: string;
}

function EnvVariableListView(props: EnvVariableListProps) {
  const { serviceId, serviceName } = props;

  const { isLoading, data: variables } = useCachedPromise(
    async () => {
      const variables = await renderService.getEnvVariables(serviceId);
      return variables;
    },
    [],
    {
      onError(error) {
        handleError(error);
      },
      initialData: {},
    },
  );

  const navigationTitle = `${serviceName}: Environment Variables`;

  return (
    <List
      navigationTitle={navigationTitle}
      isLoading={isLoading}
      searchBarPlaceholder="Search environment variable"
    >
      {Object.entries(variables).map(([key, value]) => (
        <List.Item
          key={key}
          title={key}
          subtitle={value}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={`${key}=${value}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface DomainListProps {
  serviceId: string;
  serviceName: string;
}

function DomainListView(props: DomainListProps) {
  const { serviceId, serviceName } = props;

  const { isLoading, data: domains } = useCachedPromise(
    async () => {
      const domains = await renderService.getDomains(serviceId);
      return domains;
    },
    [],
    {
      onError(error) {
        handleError(error);
      },
      initialData: [],
    },
  );

  const navigationTitle = `${serviceName}: Domains`;

  return (
    <List
      navigationTitle={navigationTitle}
      isLoading={isLoading}
      searchBarPlaceholder="Search domain"
    >
      {domains.map((domain) => (
        <List.Item icon={getDomainIcon(domain.verified)} title={domain.name} />
      ))}
    </List>
  );
}

function handleError(e: unknown) {
  if (e instanceof AuthError) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Failed to authorize',
      message: 'Please make sure that your API key is valid.',
    });
  } else if (e instanceof NetworkError) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Network error',
      message: 'Please try again later.',
    });
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: 'Unknown error',
    });
  }
}
