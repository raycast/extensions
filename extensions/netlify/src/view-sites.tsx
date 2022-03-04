import { ActionPanel, Detail, Icon, List, Action } from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';
import Service, {
  Deploy,
  DeployItem,
  DeployStatus,
  Site,
  SiteItem,
} from './service';
import {
  formatDate,
  formatDeployDate,
  getDeployUrl,
  getSiteUrl,
  getToken,
} from './utils';

const service = new Service(getToken());

export default function Command() {
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const siteMap = useMemo(() => {
    const map: Record<string, SiteItem[]> = {};
    for (const site of sites) {
      const { id } = site.team;
      if (!map[id]) {
        map[id] = [];
      }
      map[id].push(site);
    }
    return map;
  }, [sites]);

  const teams = useMemo(() => {
    const map: Record<string, string> = {};
    for (const site of sites) {
      const { id, name } = site.team;
      if (map[id]) {
        continue;
      }
      map[id] = name;
    }
    return map;
  }, [sites]);

  useEffect(() => {
    async function fetchSites() {
      const sites = await service.getSites();
      setSites(sites);
      setLoading(false);
    }

    fetchSites();
  }, []);

  return (
    <List isLoading={isLoading}>
      {Object.keys(siteMap).map((team) => (
        <List.Section key={team} title={teams[team]}>
          {siteMap[team].map((site) => (
            <List.Item
              key={site.id}
              title={site.name}
              subtitle={site.siteUrl}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.TextDocument}
                    title="Show Details"
                    target={<SiteView id={site.id} />}
                  />
                  <Action.Push
                    icon={Icon.Hammer}
                    title="Show Deploys"
                    target={
                      <DeployListView siteId={site.id} siteName={site.name} />
                    }
                  />
                  <Action.OpenInBrowser
                    title="Open in Netlify"
                    url={getSiteUrl(site.name)}
                  />
                  <Action.OpenInBrowser title="Open Site" url={site.siteUrl} />
                  <Action.OpenInBrowser
                    title="Open Repository"
                    url={site.repositoryUrl}
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

interface SiteProps {
  id: string;
}

interface DeployListProps {
  siteId: string;
  siteName: string;
}

interface DeployProps {
  siteId: string;
  id: string;
}

interface EnvVariableProps {
  siteName: string;
  value: Record<string, string>;
}

function SiteView(props: SiteProps) {
  const [site, setSite] = useState<Site | null>(null);
  const [isLoading, setLoading] = useState<boolean>(true);

  const { id } = props;

  useEffect(() => {
    async function fetchSite() {
      const site = await service.getSite(id);
      setSite(site);
      setLoading(false);
    }

    fetchSite();
  }, []);

  if (!site) {
    return <Detail isLoading={isLoading} />;
  }
  const {
    name,
    publishDate,
    createDate,
    isAutoPublishEnabled,
    environmentVariables,
  } = site;

  const markdown = `
  # ${name}

  Autopublish **${isAutoPublishEnabled ? 'enabled' : 'disabled'}**.

  Last published on ${formatDate(publishDate)}.
  
  Created ${formatDate(createDate)}.
  `;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Site: ${site.name}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Hammer}
            title="Show Deploys"
            target={<DeployListView siteId={id} siteName={name} />}
          />
          <Action.Push
            icon={Icon.Text}
            title="Show Environment Variables"
            target={
              <EnvVariableView value={environmentVariables} siteName={name} />
            }
          />
          <Action.OpenInBrowser
            title="Open in Netlify"
            url={getSiteUrl(site.name)}
          />
          <Action.OpenInBrowser title="Open Site" url={site.siteUrl} />
          <Action.OpenInBrowser
            title="Open Repository"
            url={site.repositoryUrl}
          />
        </ActionPanel>
      }
    />
  );
}

function DeployListView(props: DeployListProps) {
  const [deploys, setDeploys] = useState<DeployItem[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const { siteId, siteName } = props;

  useEffect(() => {
    async function fetchSite() {
      const deploys = await service.getDeploys(siteId);
      setDeploys(deploys);
      setLoading(false);
    }

    fetchSite();
  }, []);

  function getStatusIcon(status: DeployStatus): Icon {
    switch (status) {
      case 'ok':
        return Icon.Checkmark;
      case 'error':
        return Icon.XmarkCircle;
      case 'skipped':
        return Icon.Circle;
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Deploys: ${siteName}`}>
      {deploys.map((deploy) => (
        <List.Item
          key={deploy.id}
          icon={getStatusIcon(deploy.status)}
          title={deploy.name}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.TextDocument}
                title="Show Details"
                target={<DeployView siteId={siteId} id={deploy.id} />}
              />
              <Action.OpenInBrowser
                title="Open in Netlify"
                url={getDeployUrl(siteName, deploy.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function DeployView(props: DeployProps) {
  const [deploy, setDeploy] = useState<Deploy | null>(null);
  const [isLoading, setLoading] = useState<boolean>(true);

  const { siteId, id } = props;

  useEffect(() => {
    async function fetchSite() {
      const deploy = await service.getDeploy(siteId, id);
      setDeploy(deploy);
      setLoading(false);
    }

    fetchSite();
  }, []);

  if (!deploy) {
    return <Detail isLoading={isLoading} navigationTitle="Deploy" />;
  }
  const { name, site, siteUrl, author, publishDate, commitUrl } = deploy;

  const authorMessage = author ? ` by ${author}` : '';

  const markdown = `
  # ${name}

  Published on ${formatDeployDate(publishDate)}${authorMessage}.
  `;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Deploy"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Netlify"
            url={getDeployUrl(site.name, id)}
          />
          <Action.OpenInBrowser title="Open Site" url={siteUrl} />
          <Action.OpenInBrowser title="Open Commit" url={commitUrl} />
        </ActionPanel>
      }
    />
  );
}

function EnvVariableView(props: EnvVariableProps) {
  const { value, siteName } = props;

  return (
    <List navigationTitle={`Variables: ${siteName}`}>
      {Object.entries(value).map(([key, value]) => (
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
