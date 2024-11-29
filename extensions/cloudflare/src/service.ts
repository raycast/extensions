import axios, { AxiosInstance } from 'axios';
import { Cache } from '@raycast/api';

interface Response<T> {
  result: T;
  result_info: {
    page: number;
    per_page: number;
    total_pages: number;
    count: number;
    total_count: number;
  };
}

interface AccountItem {
  id: string;
  name: string;
  type: string;
}

interface Account {
  id: string;
  name: string;
}

type ZoneStatus =
  | 'active'
  | 'pending'
  | 'initializing'
  | 'moved'
  | 'deleted'
  | 'deactivated'
  | 'read only';

interface ZoneItem {
  id: string;
  name: string;
  status: ZoneStatus;
  paused: false;
  type: string;
  development_mode: number;
  name_servers: string[];
  modified_on: string;
  created_on: string;
  activated_on: string;
  permissions: string[];
}

interface Zone {
  id: string;
  name: string;
  status: ZoneStatus;
  nameServers: string[];
}

interface DnsRecordItem {
  name: string;
  type: string;
  content: string;
}

interface DnsRecord {
  name: string;
  type: string;
  content: string;
}

interface CloudflareError {
  code: number;
  message: string;
}

interface CachePurgeResult {
  success: boolean;
  errors: CloudflareError[];
  messages: string[];
  result: {
    id: string;
  };
}

type SourceType = 'github' | 'gitlab';

interface SourceItem {
  type: SourceType;
  config: {
    owner: string;
    repo_name: string;
    deployments_enabled: boolean;
  };
}

interface PageItem {
  name: string;
  subdomain: string;
  domains: string;
  source?: SourceItem;
  latest_deployment: DeploymentItem;
}

interface Source {
  type: SourceType;
  config: {
    owner: string;
    repo: string;
    autopublishEnabled: boolean;
  };
}

interface Page {
  name: string;
  subdomain: string;
  source?: Source;
  status: DeploymentStatus;
}

type DeploymentStatus = 'active' | 'success' | 'failure';

interface DeploymentItem {
  id: string;
  url: string;
  latest_stage: {
    status: DeploymentStatus;
  };
  deployment_trigger: {
    metadata: {
      commit_hash: string;
      commit_message: string;
    };
  };
  source: SourceItem;
}

interface Deployment {
  id: string;
  url: string;
  status: DeploymentStatus;
  commit: {
    hash: string;
    message: string;
  };
  source: Source;
}

type DomainStatus = 'active' | 'pending';

interface Domain {
  name: string;
  status: DomainStatus;
}

type MemberStatus = 'accepted' | 'rejected' | 'pending';

interface MemberItem {
  user: {
    email: string;
  };
  status: MemberStatus;
  roles: {
    name: string;
  }[];
}

interface Member {
  email: string;
  status: MemberStatus;
  role: string;
}

class Service {
  client: AxiosInstance;
  cache: Cache = new Cache();

  constructor(token: string) {
    this.client = axios.create({
      baseURL: 'https://api.cloudflare.com/client/v4/',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
    });
  }

  async listAccounts(): Promise<Account[]> {
    let data;
    if (this.cache.has('accounts')) {
      data = JSON.parse(this.cache.get('accounts')!) as Response<AccountItem[]>;
    } else {
      const response =
        await this.client.get<Response<AccountItem[]>>('accounts');
      data = response.data;
      this.cache.set('accounts', JSON.stringify(data));
    }
    return data.result.map((item) => {
      const { id, name } = item;
      return {
        id,
        name,
      };
    });
  }

  clearCache() {
    this.cache.clear();
  }

  async listZones(account: Account): Promise<Zone[]> {
    const { id } = account;

    let result;
    // get from cache if cache is available
    if (this.cache.has(`zones-${id}`)) {
      try {
        result = JSON.parse(this.cache.get(`zones-${id}`)!) as ZoneItem[];
        return result.map((item) => formatZone(item));
      } catch (e) {
        // Whenever the cache can't be parsed, clear it and fetch from API
        this.cache.remove(`zones-${id}`);
      }
    }

    const response = await this.client.get<Response<ZoneItem[]>>('zones', {
      params: { 'account.id': id, per_page: 20 },
    });
    result = response.data.result;

    // if page is not the last page, fetch the remaining pages
    for (let i = 2; i <= response.data.result_info.total_pages; i++) {
      const next = await this.client.get<Response<ZoneItem[]>>('zones', {
        params: { 'account.id': id, per_page: 20, page: i },
      });
      result = result.concat(next.data.result);
    }

    this.cache.set(`zones-${id}`, JSON.stringify(result));
    return result.map((item) => formatZone(item));
  }

  async getZone(id: string): Promise<ZoneItem> {
    const response = await this.client.get<Response<ZoneItem>>(`zones/${id}`);
    return response.data.result;
  }

  async listDnsRecords(zoneId: string): Promise<DnsRecord[]> {
    const response = await this.client.get<Response<DnsRecordItem[]>>(
      `zones/${zoneId}/dns_records`,
    );
    return response.data.result.map((item) => {
      const { name, type, content } = item;
      return { name, type, content };
    });
  }

  async purgeFilesbyURL(
    zoneId: string,
    urls: string[],
  ): Promise<CachePurgeResult> {
    const response = await this.client.post<CachePurgeResult>(
      `zones/${zoneId}/purge_cache`,
      {
        files: urls,
      },
    );
    const { success, errors, messages, result } = response.data;
    return { success, errors, messages, result };
  }

  async purgeEverything(zoneId: string): Promise<CachePurgeResult> {
    const response = await this.client.post<CachePurgeResult>(
      `zones/${zoneId}/purge_cache`,
      {
        purge_everything: true,
      },
    );
    const { success, errors, messages, result } = response.data;
    return { success, errors, messages, result };
  }

  async listPages(accountId: string): Promise<Page[]> {
    const response = await this.client.get<Response<PageItem[]>>(
      `accounts/${accountId}/pages/projects`,
    );
    return response.data.result.map((item) => formatPage(item));
  }

  async getPage(accountId: string, name: string): Promise<Page> {
    const response = await this.client.get<Response<PageItem>>(
      `accounts/${accountId}/pages/projects/${name}`,
    );
    return formatPage(response.data.result);
  }

  async listDeployments(
    accountId: string,
    pageName: string,
  ): Promise<Deployment[]> {
    const response = await this.client.get<Response<DeploymentItem[]>>(
      `accounts/${accountId}/pages/projects/${pageName}/deployments`,
    );
    return response.data.result.map((item) => formatDeployment(item));
  }

  async getDeployment(
    accountId: string,
    pageName: string,
    id: string,
  ): Promise<Deployment> {
    const response = await this.client.get<Response<DeploymentItem>>(
      `accounts/${accountId}/pages/projects/${pageName}/deployments/${id}`,
    );
    return formatDeployment(response.data.result);
  }

  async listDomains(accountId: string, pageName: string): Promise<Domain[]> {
    const response = await this.client.get<Response<Domain[]>>(
      `accounts/${accountId}/pages/projects/${pageName}/domains`,
    );
    return response.data.result.map((item) => {
      const { name, status } = item;
      return {
        name,
        status,
      };
    });
  }

  async listMembers(accountId: string): Promise<Member[]> {
    const response = await this.client.get<Response<MemberItem[]>>(
      `accounts/${accountId}/members`,
    );
    return response.data.result.map((item) => {
      const { user, status, roles } = item;
      return {
        email: user.email,
        status,
        role: roles[0].name,
      };
    });
  }
}

function formatZone(item: ZoneItem): Zone {
  const { id, name, status, name_servers } = item;
  return { id, name, status, nameServers: name_servers };
}

function formatPage(item: PageItem): Page {
  const { name, subdomain, source, latest_deployment } = item;
  return {
    name,
    subdomain,
    source: source
      ? {
          type: source.type,
          config: {
            owner: source.config.owner,
            repo: source.config.repo_name,
            autopublishEnabled: source.config.deployments_enabled,
          },
        }
      : undefined,
    status: latest_deployment.latest_stage.status,
  };
}

function formatDeployment(item: DeploymentItem): Deployment {
  const { id, url, deployment_trigger, latest_stage, source } = item;
  return {
    id,
    url,
    commit: {
      hash: deployment_trigger.metadata.commit_hash,
      message: deployment_trigger.metadata.commit_message,
    },
    status: latest_stage.status,
    source: {
      type: source.type,
      config: {
        owner: source.config.owner,
        repo: source.config.repo_name,
        autopublishEnabled: source.config.deployments_enabled,
      },
    },
  };
}

export default Service;
export type {
  Account,
  Deployment,
  DeploymentStatus,
  DnsRecord,
  Domain,
  DomainStatus,
  Member,
  MemberStatus,
  Page,
  Source,
  Zone,
  ZoneStatus,
};
