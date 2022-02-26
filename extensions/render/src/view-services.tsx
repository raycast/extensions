import {
  ActionPanel,
  CopyToClipboardAction,
  Detail,
  Icon,
  List,
  ListItem,
  ListSection,
  OpenInBrowserAction,
  PushAction,
  showToast,
  ToastStyle,
} from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';
import Service, {
  AuthError,
  DeployResponse,
  DomainResponse,
  NetworkError,
  Owner,
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

const renderService = new Service(getKey());

export default function Command() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const serviceMap = useMemo(() => {
    const map: Record<string, ServiceResponse[]> = {};
    for (const service of services) {
      const { ownerId } = service;
      if (!map[ownerId]) {
        map[ownerId] = [];
      }
      map[ownerId].push(service);
    }
    return map;
  }, [services]);

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

  useEffect(() => {
    async function fetchServices() {
      try {
        const owners = await renderService.getOwners();
        const services = await renderService.getServices();
        setOwners(owners);
        setServices(services);
      } catch (e) {
        handleError(e);
      }
      setLoading(false);
    }

    fetchServices();
  }, []);

  return (
    <List isLoading={isLoading}>
      {Object.keys(ownerMap).map((owner) => (
        <ListSection key={owner} title={ownerMap[owner]}>
          {serviceMap[owner] &&
            serviceMap[owner].map((service) => (
              <ListItem
                key={service.id}
                icon={getServiceIcon(service)}
                title={service.name}
                subtitle={formatServiceType(service)}
                actions={
                  <ActionPanel>
                    <PushAction
                      icon={Icon.TextDocument}
                      title="Show Details"
                      target={<ServiceView service={service} />}
                    />
                    <PushAction
                      icon={Icon.Hammer}
                      title="Show Deploys"
                      target={<DeployListView service={service} />}
                      shortcut={{ modifiers: ['cmd'], key: 'd' }}
                    />
                    <OpenInBrowserAction
                      title="Open in Render"
                      url={getServiceUrl(service)}
                      shortcut={{ modifiers: ['cmd'], key: 'r' }}
                    />
                    <OpenInBrowserAction
                      title="Open Repo"
                      url={service.repo}
                      shortcut={{ modifiers: ['cmd'], key: 'g' }}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </ListSection>
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
          <PushAction
            icon={Icon.Hammer}
            title="Show Deploys"
            target={<DeployListView service={service} />}
          />
          <PushAction
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
          <PushAction
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
          <OpenInBrowserAction
            title="Open in Render"
            url={getServiceUrl(service)}
            shortcut={{ modifiers: ['cmd'], key: 'r' }}
          />
          <OpenInBrowserAction
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

  const [deploys, setDeploys] = useState<DeployResponse[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const navigationTitle = `${service.name}: Deploys`;

  useEffect(() => {
    async function fetchDeploys() {
      try {
        const deploys = await renderService.getDeploys(service.id);
        setDeploys(deploys);
      } catch (e) {
        handleError(e);
      }
      setLoading(false);
    }

    fetchDeploys();
  }, []);

  return (
    <List navigationTitle={navigationTitle} isLoading={isLoading}>
      {deploys.map((deploy) => (
        <ListItem
          key={deploy.id}
          icon={getDeployStatusIcon(deploy.status)}
          title={formatCommit(deploy.commit.message)}
          actions={
            <ActionPanel>
              <PushAction
                icon={Icon.TextDocument}
                title="Show Details"
                target={<DeployView service={service} deploy={deploy} />}
              />
              <OpenInBrowserAction
                title="Open in Render"
                url={getDeployUrl(service, deploy.id)}
                shortcut={{ modifiers: ['cmd'], key: 'r' }}
              />
              <OpenInBrowserAction
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
          <OpenInBrowserAction
            title="Open in Render"
            url={getDeployUrl(service, deploy.id)}
            shortcut={{ modifiers: ['cmd'], key: 'r' }}
          />
          <OpenInBrowserAction
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

  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isLoading, setLoading] = useState<boolean>(true);

  const navigationTitle = `${serviceName}: Environment Variables`;

  useEffect(() => {
    async function fetchVariables() {
      try {
        const variables = await renderService.getEnvVariables(serviceId);
        setVariables(variables);
      } catch (e) {
        handleError(e);
      }
      setLoading(false);
    }

    fetchVariables();
  }, []);

  return (
    <List navigationTitle={navigationTitle} isLoading={isLoading}>
      {Object.entries(variables).map(([key, value]) => (
        <ListItem
          key={key}
          title={key}
          subtitle={value}
          actions={
            <ActionPanel>
              <CopyToClipboardAction content={`${key}=${value}`} />
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

  const [domains, setDomains] = useState<DomainResponse[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const navigationTitle = `${serviceName}: Domains`;

  useEffect(() => {
    async function fetchDomains() {
      try {
        const domains = await renderService.getDomains(serviceId);
        setDomains(domains);
      } catch (e) {
        handleError(e);
      }
      setLoading(false);
    }

    fetchDomains();
  });

  return (
    <List navigationTitle={navigationTitle} isLoading={isLoading}>
      {domains.map((domain) => (
        <ListItem icon={getDomainIcon(domain.verified)} title={domain.name} />
      ))}
    </List>
  );
}

function handleError(e: unknown) {
  if (e instanceof AuthError) {
    showToast(
      ToastStyle.Failure,
      'Failed to authorize',
      'Please make sure that your API key is valid.'
    );
  } else if (e instanceof NetworkError) {
    showToast(ToastStyle.Failure, 'Network error', 'Please try again later.');
  } else {
    showToast(ToastStyle.Failure, 'Unknown error');
  }
}
