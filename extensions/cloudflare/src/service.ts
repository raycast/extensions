import axios, { AxiosInstance } from 'axios';

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
  source: SourceItem;
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
  source: Source;
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

  constructor(email: string, key: string) {
    this.client = axios.create({
      baseURL: 'https://api.cloudflare.com/client/v4/',
      headers: {
        'X-Auth-Email': email,
        'X-Auth-Key': key,
        'Content-Type': 'application/json',
      },
    });
  }

  async listAccounts(): Promise<Account[]> {
    const response = await this.client.get<Response<AccountItem[]>>('accounts');
    return response.data.result.map((item) => {
      const { id, name } = item;
      return {
        id,
        name,
      };
    });
  }

  async listZones(account: Account): Promise<Zone[]> {
    const { id } = account;
    const response = await this.client.get<Response<ZoneItem[]>>('zones', {
      params: {
        'account.id': id,
      },
    });
    return response.data.result.map((item) => formatZone(item));
  }

  async getZone(id: string): Promise<Zone> {
    const response = await this.client.get<Response<ZoneItem>>(`zones/${id}`);
    return formatZone(response.data.result);
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
    source: {
      type: source.type,
      config: {
        owner: source.config.owner,
        repo: source.config.repo_name,
        autopublishEnabled: source.config.deployments_enabled,
      },
    },
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
