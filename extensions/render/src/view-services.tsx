import {
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  showToast,
  Action,
  Toast,
  getPreferenceValues,
} from '@raycast/api';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Service, {
  AuthError,
  DeployResponse,
  NetworkError,
  ServiceResponse,
} from './service';
import {
  getCommitUrl,
  getDeployStatusIcon,
  getDeployStatusColor,
  getDeployUrl,
  getKey,
  getServiceUrl,
  formatDate,
  formatDeployStatus,
  formatServiceType,
  formatCommit,
  getDomainIcon,
  getServiceIcon,
  isDeployInProgress,
} from './utils';
import { useCachedPromise, useLocalStorage } from '@raycast/utils';

const renderService = new Service(getKey());

const { defaultAction } = getPreferenceValues();

interface ServiceActionsProps {
  service: ServiceResponse;
  isPinned: boolean;
  onPinAction: () => void;
}

function ServiceActions({
  service,
  isPinned,
  onPinAction,
}: ServiceActionsProps) {
  const showDetailsAction = (
    <Action.Push
      key="details"
      icon={Icon.BlankDocument}
      title="Show Details"
      target={<ServiceView service={service} />}
      shortcut={{ modifiers: ['cmd'], key: 'i' }}
    />
  );

  const showDeploysAction = (
    <Action.Push
      key="deploys"
      icon={Icon.Hammer}
      title="Show Deploys"
      target={<DeployListView service={service} />}
      shortcut={{ modifiers: ['cmd'], key: 'd' }}
    />
  );

  const openInRenderAction = (
    <Action.OpenInBrowser
      key="render"
      title="Open in Render"
      url={getServiceUrl(service)}
      shortcut={{ modifiers: ['cmd'], key: 'r' }}
    />
  );

  const secondaryActions = [
    showDetailsAction,
    showDeploysAction,
    openInRenderAction,
  ];
  const primaryAction =
    secondaryActions.find(
      (a) =>
        (defaultAction === 'showDetails' && a.key === 'details') ||
        (defaultAction === 'showDeploys' && a.key === 'deploys') ||
        (defaultAction === 'openInRender' && a.key === 'render'),
    ) || showDetailsAction;

  const orderedActions = [
    primaryAction,
    ...secondaryActions.filter((a) => a.key !== primaryAction.key),
  ];

  return (
    <ActionPanel>
      {orderedActions}
      <Action.OpenInBrowser
        title="Open Repo"
        url={service.repo}
        shortcut={{ modifiers: ['cmd'], key: 'g' }}
      />
      <Action
        icon={isPinned ? Icon.PinDisabled : Icon.Pin}
        title={isPinned ? 'Unpin Service' : 'Pin Service'}
        shortcut={{ modifiers: ['cmd', 'shift'], key: 'p' }}
        onAction={onPinAction}
      />
    </ActionPanel>
  );
}

function getServiceStatusTag(
  service: ServiceResponse,
  deploy: DeployResponse | null | undefined,
  isLoading: boolean,
): { value: string; color: Color } | null {
  // Service-level suspended takes priority
  if (service.suspended === 'suspended') {
    return { value: 'Suspended', color: Color.SecondaryText };
  }

  // Loading state
  if (isLoading && !deploy) {
    return { value: '...', color: Color.SecondaryText };
  }

  // Deploy status
  if (deploy) {
    return {
      value: formatDeployStatus(deploy.status),
      color: getDeployStatusColor(deploy.status),
    };
  }

  return null;
}

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

  const [deployStatuses, setDeployStatuses] = useState<
    Record<string, DeployResponse | null>
  >({});
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDeployStatuses = useCallback(async () => {
    if (services.length === 0) return;

    setIsLoadingStatuses(true);
    const statuses: Record<string, DeployResponse | null> = {};

    await Promise.all(
      services.map(async (service) => {
        const deploy = await renderService.getLatestDeploy(service.id);
        statuses[service.id] = deploy;
      }),
    );

    setDeployStatuses(statuses);
    setIsLoadingStatuses(false);

    return statuses;
  }, [services]);

  // Initial fetch and polling setup
  useEffect(() => {
    if (services.length === 0) return;

    // Initial fetch
    fetchDeployStatuses().then((statuses) => {
      if (!statuses) return;

      // Check if any deploys are in progress
      const hasInProgress = Object.values(statuses).some(
        (deploy) => deploy && isDeployInProgress(deploy.status),
      );

      // Start polling if there are in-progress deploys
      if (hasInProgress && !pollingRef.current) {
        pollingRef.current = setInterval(async () => {
          const newStatuses = await fetchDeployStatuses();

          // Stop polling if no more in-progress deploys
          if (newStatuses) {
            const stillInProgress = Object.values(newStatuses).some(
              (deploy) => deploy && isDeployInProgress(deploy.status),
            );
            if (!stillInProgress && pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          }
        }, 5000);
      }
    });

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [services, fetchDeployStatuses]);

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
                ...(() => {
                  const tag = getServiceStatusTag(
                    service,
                    deployStatuses[service.id],
                    isLoadingStatuses,
                  );
                  return tag ? [{ tag }] : [];
                })(),
                { date: new Date(service.updatedAt) },
              ]}
              actions={
                <ServiceActions
                  service={service}
                  isPinned={true}
                  onPinAction={() => unpinService(service.id)}
                />
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
                accessories={[
                  ...(() => {
                    const tag = getServiceStatusTag(
                      service,
                      deployStatuses[service.id],
                      isLoadingStatuses,
                    );
                    return tag ? [{ tag }] : [];
                  })(),
                  { date: new Date(service.updatedAt) },
                ]}
                actions={
                  <ServiceActions
                    service={service}
                    isPinned={false}
                    onPinAction={() => pinService(service.id)}
                  />
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
          icon={{
            source: getDeployStatusIcon(deploy.status),
            tintColor: getDeployStatusColor(deploy.status),
          }}
          title={formatCommit(deploy.commit.message)}
          accessories={
            deploy.finishedAt
              ? [{ date: new Date(deploy.finishedAt) }]
              : [{ text: formatDeployStatus(deploy.status) }]
          }
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

  const dateString = deploy.finishedAt
    ? formatDate(new Date(deploy.finishedAt))
    : 'In progress';

  const markdown = `
  # ${formatCommit(deploy.commit.message)}

  ${dateString}

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
