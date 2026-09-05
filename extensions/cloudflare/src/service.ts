import axios, { AxiosInstance, isAxiosError } from 'axios';
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
  id: string;
  name: string;
  type: string;
  content: string;
  ttl: number;
  proxied?: boolean;
  comment?: string | null;
  tags?: string[];
  priority?: number;
  data?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

interface DnsRecord {
  id: string;
  name: string;
  type: string;
  content: string;
  ttl: number;
  proxied?: boolean;
  comment?: string | null;
  tags: string[];
  priority?: number;
  data?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

type DnsRecordCreate = Omit<DnsRecordItem, 'id'>;

type DnsRecordUpdate = Partial<
  Pick<
    DnsRecordItem,
    | 'name'
    | 'content'
    | 'ttl'
    | 'proxied'
    | 'comment'
    | 'tags'
    | 'priority'
    | 'data'
    | 'settings'
  >
>;

interface DnsBatchOperations {
  deletes?: Array<{ id: string }>;
  patches?: Array<DnsRecordUpdate & { id: string }>;
  posts?: DnsRecordCreate[];
}

interface DnsBatchResult {
  deleted: number;
  patched: number;
  posted: number;
}

interface DnsImportResult {
  recordsAdded: number;
  totalRecordsParsed: number;
}

type DnssecStatus =
  | 'active'
  | 'pending'
  | 'disabled'
  | 'pending-disabled'
  | 'error';

interface Dnssec {
  algorithm?: string;
  digest?: string;
  digestAlgorithm?: string;
  digestType?: string;
  ds?: string;
  flags?: number;
  keyTag?: number;
  keyType?: string;
  modifiedOn?: string;
  publicKey?: string;
  status: DnssecStatus;
}

interface DnssecItem {
  algorithm?: string;
  digest?: string;
  digest_algorithm?: string;
  digest_type?: string;
  ds?: string;
  flags?: number;
  key_tag?: number;
  key_type?: string;
  modified_on?: string;
  public_key?: string;
  status?: DnssecStatus;
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
  latest_deployment: DeploymentItem | null;
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

type DeploymentStatus = 'active' | 'success' | 'failure' | 'unknown';

interface DeploymentItem {
  id: string;
  url: string;
  created_on: string;
  modified_on?: string;
  aliases?: string[];
  environment?: string;
  is_skipped?: boolean;
  skip_reason?: string;
  uses_functions?: boolean;
  stages?: Array<{
    name: string;
    status: DeploymentStatus | 'idle' | 'canceled';
    started_on?: string;
    ended_on?: string;
  }>;
  latest_stage: {
    status: DeploymentStatus;
  } | null;
  deployment_trigger?: {
    type?: string;
    metadata: {
      branch?: string;
      commit_hash?: string;
      commit_message?: string;
    };
  };
  source?: SourceItem;
}

interface Deployment {
  id: string;
  url: string;
  createdOn: string;
  modifiedOn?: string;
  aliases: string[];
  environment?: string;
  isSkipped: boolean;
  skipReason?: string;
  usesFunctions: boolean;
  stages: Array<{
    name: string;
    status: DeploymentStatus | 'idle' | 'canceled';
    startedOn?: string;
    endedOn?: string;
  }>;
  trigger: {
    type?: string;
    branch?: string;
  };
  status: DeploymentStatus;
  commit: {
    hash: string;
    message: string;
  };
  source?: Source;
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

interface WorkerItem {
  id: string;
  compatibility_date?: string;
  compatibility_flags?: string[];
  etag: string;
  created_on: string;
  handlers?: string[];
  modified_on: string;
  logpush?: boolean;
  placement?: {
    mode?: string;
    last_analyzed_at?: string;
    status?: string;
  };
  usage_model?: string;
  has_assets?: boolean;
  has_modules?: boolean;
}

interface Worker {
  id: string;
  compatibilityDate?: string;
  compatibilityFlags: string[];
  createdOn: string;
  handlers: string[];
  modifiedOn: string;
  logpush: boolean;
  placement?: {
    mode?: string;
    lastAnalyzedAt?: string;
    status?: string;
  };
  usageModel?: string;
  hasAssets: boolean;
  hasModules: boolean;
}

interface AuditLog {
  id: string;
  account: {
    id: string;
    name: string;
  };
  action: {
    description: string;
    result: 'success' | 'failure';
    time: string;
    type: 'create' | 'delete' | 'view' | 'update';
  };
  actor: {
    context?: string;
    email?: string;
    ipAddress?: string;
    type?: string;
  };
  raw?: {
    method?: string;
    statusCode?: number;
    uri?: string;
  };
  resource?: {
    id?: string;
    product?: string;
    type?: string;
  };
  zone?: {
    id?: string;
    name?: string;
  };
}

interface AuditLogItem {
  id: string;
  account: {
    id: string;
    name: string;
  };
  action: {
    description: string;
    result: 'success' | 'failure';
    time: string;
    type: 'create' | 'delete' | 'view' | 'update';
  };
  actor: {
    context?: string;
    email?: string;
    ip_address?: string;
    type?: string;
  };
  raw?: {
    method?: string;
    status_code?: number;
    uri?: string;
  };
  resource?: {
    id?: string;
    product?: string;
    type?: string;
  };
  zone?: {
    id?: string;
    name?: string;
  };
}

interface AuditLogResponse {
  result: AuditLogItem[];
  result_info: {
    count: string;
    cursor?: string;
  };
}

interface PageDeploymentLog {
  line: string;
  timestamp: string;
}

interface PageDeploymentLogsItem {
  data: Array<{
    line: string;
    ts: string;
  }>;
  includes_container_logs: boolean;
  total: number;
}

interface WorkerVersion {
  id: string;
  number?: number;
  createdOn?: string;
  modifiedOn?: string;
  source?: string;
  authorEmail?: string;
}

interface WorkerVersionItem {
  id: string;
  number?: number;
  metadata?: {
    author_email?: string;
    created_on?: string;
    modified_on?: string;
    source?: string;
  };
}

interface WorkerVersionDetail extends WorkerVersion {
  bindings: Array<{
    name: string;
    type: string;
    resource?: string;
  }>;
  handlers: string[];
  namedHandlers: Array<{ name: string; handlers: string[] }>;
  lastDeployedFrom?: string;
  compatibilityDate?: string;
  compatibilityFlags: string[];
  exports: Array<{ name: string; type: string; state?: string }>;
  cpuLimitMs?: number;
  usageModel?: string;
}

interface WorkerVersionDetailItem extends WorkerVersionItem {
  resources?: {
    bindings?: unknown;
    script?: {
      handlers?: string[];
      last_deployed_from?: string;
      named_handlers?: Array<{ name?: string; handlers?: string[] }>;
    };
    script_runtime?: {
      compatibility_date?: string;
      compatibility_flags?: string[];
      exports?: Record<string, { type?: string; state?: string }>;
      limits?: { cpu_ms?: number };
      usage_model?: string;
    };
  };
}

interface WorkerDeployment {
  id: string;
  createdOn: string;
  source?: string;
  authorEmail?: string;
  message?: string;
  versions: Array<{
    percentage: number;
    versionId: string;
  }>;
}

interface WorkerDeploymentItem {
  id: string;
  created_on: string;
  source?: string;
  author_email?: string;
  annotations?: {
    'workers/message'?: string;
    'workers/triggered_by'?: string;
  };
  versions: Array<{
    percentage: number;
    version_id: string;
  }>;
}

interface ZoneAnalytics {
  since: string;
  until: string;
  requests: number;
  cachedRequests: number;
  bandwidth: number;
  cachedBandwidth: number;
  pageViews: number;
  uniqueVisitors: number;
  threats: number;
}

interface ZoneAnalyticsResponse {
  result: {
    totals?: {
      requests?: { all?: number; cached?: number };
      bandwidth?: { all?: number; cached?: number };
      pageviews?: { all?: number };
      uniques?: { all?: number };
      threats?: { all?: number };
    };
  };
  query?: {
    since?: string;
    until?: string;
  };
}

type ZoneSettingValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, unknown>;

interface ZoneSettingItem {
  id: string;
  value: ZoneSettingValue;
  editable?: boolean;
  modified_on?: string;
}

interface ZoneSetting {
  id: string;
  value: ZoneSettingValue;
  editable: boolean;
  modifiedOn: string | undefined;
}

interface CertificateItem {
  id: string;
  hosts: string[];
  status: string;
  expires_on?: string;
  issuer?: string;
  signature?: string;
}

interface CertificatePackItem {
  id: string;
  hosts: string[];
  status: string;
  type: string;
  certificate_authority?: string;
  validation_method?: string;
  validation_errors?: Array<{ message?: string }>;
  certificates?: CertificateItem[];
}

interface CertificatePack {
  id: string;
  hosts: string[];
  status: string;
  type: string;
  certificateAuthority?: string;
  validationMethod?: string;
  validationErrors: string[];
  certificates: Array<{
    id: string;
    hosts: string[];
    status: string;
    expiresOn?: string;
    issuer?: string;
    signature?: string;
  }>;
}

interface WorkerRoute {
  id: string;
  pattern: string;
  script?: string;
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
      } catch {
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

  async getZoneAnalytics(
    zoneId: string,
    since: Date,
    until: Date,
  ): Promise<ZoneAnalytics> {
    const response = await this.client.get<ZoneAnalyticsResponse>(
      `zones/${zoneId}/analytics/dashboard`,
      {
        params: {
          since: since.toISOString(),
          until: until.toISOString(),
          continuous: false,
        },
      },
    );
    const totals = response.data.result.totals;
    return {
      since: response.data.query?.since ?? since.toISOString(),
      until: response.data.query?.until ?? until.toISOString(),
      requests: totals?.requests?.all ?? 0,
      cachedRequests: totals?.requests?.cached ?? 0,
      bandwidth: totals?.bandwidth?.all ?? 0,
      cachedBandwidth: totals?.bandwidth?.cached ?? 0,
      pageViews: totals?.pageviews?.all ?? 0,
      uniqueVisitors: totals?.uniques?.all ?? 0,
      threats: totals?.threats?.all ?? 0,
    };
  }

  async getZoneSettings(
    zoneId: string,
    settingIds: string[],
  ): Promise<ZoneSetting[]> {
    const settings = await Promise.all(
      settingIds.map(async (settingId) => {
        try {
          const response = await this.client.get<Response<ZoneSettingItem>>(
            `zones/${zoneId}/settings/${settingId}`,
          );
          const item = response.data.result;
          return {
            id: item.id,
            value: item.value,
            editable: item.editable ?? false,
            modifiedOn: item.modified_on,
          } satisfies ZoneSetting;
        } catch (error) {
          if (isAxiosError(error) && error.response?.status === 404) {
            return undefined;
          }
          throw error;
        }
      }),
    );
    return settings.filter(
      (setting): setting is ZoneSetting => setting !== undefined,
    );
  }

  async listCertificatePacks(zoneId: string): Promise<CertificatePack[]> {
    const response = await this.client.get<Response<CertificatePackItem[]>>(
      `zones/${zoneId}/ssl/certificate_packs`,
      { params: { per_page: 50, status: 'all' } },
    );
    let packs = response.data.result;
    for (let page = 2; page <= response.data.result_info.total_pages; page++) {
      const next = await this.client.get<Response<CertificatePackItem[]>>(
        `zones/${zoneId}/ssl/certificate_packs`,
        { params: { per_page: 50, page, status: 'all' } },
      );
      packs = packs.concat(next.data.result);
    }
    return packs.map((pack) => ({
      id: pack.id,
      hosts: pack.hosts,
      status: pack.status,
      type: pack.type,
      certificateAuthority: pack.certificate_authority,
      validationMethod: pack.validation_method,
      validationErrors: (pack.validation_errors ?? [])
        .map((error) => error.message)
        .filter((message): message is string => Boolean(message)),
      certificates: (pack.certificates ?? []).map((certificate) => ({
        id: certificate.id,
        hosts: certificate.hosts,
        status: certificate.status,
        expiresOn: certificate.expires_on,
        issuer: certificate.issuer,
        signature: certificate.signature,
      })),
    }));
  }

  async listWorkerRoutes(zoneId: string): Promise<WorkerRoute[]> {
    const response = await this.client.get<Response<WorkerRoute[]>>(
      `zones/${zoneId}/workers/routes`,
    );
    return response.data.result;
  }

  async listDnsRecords(zoneId: string): Promise<DnsRecord[]> {
    const response = await this.client.get<Response<DnsRecordItem[]>>(
      `zones/${zoneId}/dns_records`,
      { params: { per_page: 100 } },
    );
    let records = response.data.result;
    for (let page = 2; page <= response.data.result_info.total_pages; page++) {
      const next = await this.client.get<Response<DnsRecordItem[]>>(
        `zones/${zoneId}/dns_records`,
        { params: { per_page: 100, page } },
      );
      records = records.concat(next.data.result);
    }
    return records.map(formatDnsRecord);
  }

  async searchDnsRecords(zoneId: string, search: string): Promise<DnsRecord[]> {
    const response = await this.client.get<Response<DnsRecordItem[]>>(
      `zones/${zoneId}/dns_records`,
      { params: { search, match: 'any', per_page: 100 } },
    );
    let records = response.data.result;
    for (let page = 2; page <= response.data.result_info.total_pages; page++) {
      const next = await this.client.get<Response<DnsRecordItem[]>>(
        `zones/${zoneId}/dns_records`,
        { params: { search, match: 'any', per_page: 100, page } },
      );
      records = records.concat(next.data.result);
    }
    return records.map(formatDnsRecord);
  }

  async createDnsRecord(
    zoneId: string,
    record: DnsRecordCreate,
  ): Promise<DnsRecordItem> {
    const response = await this.client.post<Response<DnsRecordItem>>(
      `zones/${zoneId}/dns_records`,
      record,
    );
    return response.data.result;
  }

  async deleteDnsRecord(
    zoneId: string,
    recordId: string,
  ): Promise<{ id: string }> {
    const response = await this.client.delete<Response<{ id: string }>>(
      `zones/${zoneId}/dns_records/${recordId}`,
    );
    return response.data.result;
  }

  async updateDnsRecord(
    zoneId: string,
    recordId: string,
    record: DnsRecordUpdate,
  ): Promise<DnsRecord> {
    const response = await this.client.patch<Response<DnsRecordItem>>(
      `zones/${zoneId}/dns_records/${recordId}`,
      record,
    );
    return formatDnsRecord(response.data.result);
  }

  async batchDnsRecords(
    zoneId: string,
    operations: DnsBatchOperations,
  ): Promise<DnsBatchResult> {
    const response = await this.client.post<
      Response<{
        deletes?: DnsRecordItem[];
        patches?: DnsRecordItem[];
        posts?: DnsRecordItem[];
      }>
    >(`zones/${zoneId}/dns_records/batch`, operations);
    return {
      deleted: response.data.result.deletes?.length ?? 0,
      patched: response.data.result.patches?.length ?? 0,
      posted: response.data.result.posts?.length ?? 0,
    };
  }

  async exportDnsRecords(zoneId: string): Promise<string> {
    const response = await this.client.get<string>(
      `zones/${zoneId}/dns_records/export`,
      { responseType: 'text' },
    );
    return response.data;
  }

  async importDnsRecords(
    zoneId: string,
    contents: string,
    proxied: boolean,
  ): Promise<DnsImportResult> {
    const form = new FormData();
    form.append('file', contents);
    form.append('proxied', String(proxied));
    const response = await this.client.post<
      Response<{ recs_added?: number; total_records_parsed?: number }>
    >(`zones/${zoneId}/dns_records/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      recordsAdded: response.data.result.recs_added ?? 0,
      totalRecordsParsed: response.data.result.total_records_parsed ?? 0,
    };
  }

  async getDnssec(zoneId: string): Promise<Dnssec> {
    const response = await this.client.get<Response<DnssecItem>>(
      `zones/${zoneId}/dnssec`,
    );
    return formatDnssec(response.data.result);
  }

  async setDnssecStatus(
    zoneId: string,
    status: 'active' | 'disabled',
  ): Promise<Dnssec> {
    const response = await this.client.patch<Response<DnssecItem>>(
      `zones/${zoneId}/dnssec`,
      { status },
    );
    return formatDnssec(response.data.result);
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

  async purgeByHostnames(
    zoneId: string,
    hosts: string[],
  ): Promise<CachePurgeResult> {
    const response = await this.client.post<CachePurgeResult>(
      `zones/${zoneId}/purge_cache`,
      {
        hosts,
      },
    );
    const { success, errors, messages, result } = response.data;
    return { success, errors, messages, result };
  }

  async purgeByTags(zoneId: string, tags: string[]): Promise<CachePurgeResult> {
    const response = await this.client.post<CachePurgeResult>(
      `zones/${zoneId}/purge_cache`,
      {
        tags,
      },
    );
    const { success, errors, messages, result } = response.data;
    return { success, errors, messages, result };
  }

  async purgeByPrefixes(
    zoneId: string,
    prefixes: string[],
  ): Promise<CachePurgeResult> {
    const response = await this.client.post<CachePurgeResult>(
      `zones/${zoneId}/purge_cache`,
      {
        prefixes,
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
    perPage = 20,
  ): Promise<Deployment[]> {
    const response = await this.client.get<Response<DeploymentItem[]>>(
      `accounts/${accountId}/pages/projects/${pageName}/deployments`,
      { params: { per_page: perPage } },
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

  async getPageDeploymentLogs(
    accountId: string,
    pageName: string,
    deploymentId: string,
  ): Promise<PageDeploymentLog[]> {
    const response = await this.client.get<Response<PageDeploymentLogsItem>>(
      `accounts/${accountId}/pages/projects/${pageName}/deployments/${deploymentId}/history/logs`,
    );
    return response.data.result.data.map((entry) => ({
      line: entry.line,
      timestamp: entry.ts,
    }));
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
        role: roles[0]?.name ?? 'Unknown',
      };
    });
  }

  async listWorkers(accountId: string): Promise<Worker[]> {
    const response = await this.client.get<Response<WorkerItem[]>>(
      `accounts/${accountId}/workers/scripts`,
    );
    return response.data.result.map((item) => formatWorker(item));
  }

  async listWorkerVersions(
    accountId: string,
    workerName: string,
  ): Promise<WorkerVersion[]> {
    const response = await this.client.get<
      Response<{ items?: WorkerVersionItem[] }>
    >(`accounts/${accountId}/workers/scripts/${workerName}/versions`, {
      params: { per_page: 25 },
    });
    return (response.data.result.items ?? []).map((item) => ({
      id: item.id,
      number: item.number,
      createdOn: item.metadata?.created_on,
      modifiedOn: item.metadata?.modified_on,
      source: item.metadata?.source,
      authorEmail: item.metadata?.author_email,
    }));
  }

  async listWorkerDeployments(
    accountId: string,
    workerName: string,
  ): Promise<WorkerDeployment[]> {
    const response = await this.client.get<
      Response<{ deployments?: WorkerDeploymentItem[] }>
    >(`accounts/${accountId}/workers/scripts/${workerName}/deployments`);
    return (response.data.result.deployments ?? []).map((item) => ({
      id: item.id,
      createdOn: item.created_on,
      source: item.source,
      authorEmail: item.author_email,
      message:
        item.annotations?.['workers/message'] ??
        item.annotations?.['workers/triggered_by'],
      versions: item.versions.map((version) => ({
        percentage: version.percentage,
        versionId: version.version_id,
      })),
    }));
  }

  async getWorkerVersionDetail(
    accountId: string,
    workerName: string,
    versionId: string,
  ): Promise<WorkerVersionDetail> {
    const response = await this.client.get<Response<WorkerVersionDetailItem>>(
      `accounts/${accountId}/workers/scripts/${workerName}/versions/${versionId}`,
    );
    return formatWorkerVersionDetail(response.data.result);
  }

  async listAuditLogs(accountId: string): Promise<AuditLog[]> {
    const before = new Date();
    const since = new Date(before.getTime() - 7 * 24 * 60 * 60 * 1000);
    const response = await this.client.get<AuditLogResponse>(
      `accounts/${accountId}/logs/audit`,
      {
        params: {
          before: before.toISOString(),
          since: since.toISOString(),
          direction: 'desc',
          limit: 100,
        },
      },
    );
    return response.data.result.map((item) => ({
      id: item.id,
      account: item.account,
      action: item.action,
      actor: {
        context: item.actor.context,
        email: item.actor.email,
        ipAddress: item.actor.ip_address,
        type: item.actor.type,
      },
      raw: item.raw
        ? {
            method: item.raw.method,
            statusCode: item.raw.status_code,
            uri: item.raw.uri,
          }
        : undefined,
      resource: item.resource,
      zone: item.zone,
    }));
  }
}

function formatDnsRecord(item: DnsRecordItem): DnsRecord {
  const {
    id,
    name,
    type,
    content,
    ttl,
    proxied,
    comment,
    tags,
    priority,
    data,
    settings,
  } = item;
  return {
    id,
    name,
    type,
    content,
    ttl,
    proxied,
    comment,
    tags: tags ?? [],
    priority,
    data,
    settings,
  };
}

function formatDnssec(item: DnssecItem): Dnssec {
  return {
    algorithm: item.algorithm,
    digest: item.digest,
    digestAlgorithm: item.digest_algorithm,
    digestType: item.digest_type,
    ds: item.ds,
    flags: item.flags,
    keyTag: item.key_tag,
    keyType: item.key_type,
    modifiedOn: item.modified_on,
    publicKey: item.public_key,
    status: item.status ?? 'disabled',
  };
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
    status: latest_deployment?.latest_stage?.status ?? 'unknown',
  };
}

function formatDeployment(item: DeploymentItem): Deployment {
  const { id, url, deployment_trigger, latest_stage, source } = item;
  const metadata = deployment_trigger?.metadata;
  return {
    id,
    url,
    createdOn: item.created_on,
    modifiedOn: item.modified_on,
    aliases: item.aliases ?? [],
    environment: item.environment,
    isSkipped: item.is_skipped ?? false,
    skipReason: item.skip_reason,
    usesFunctions: item.uses_functions ?? false,
    stages: (item.stages ?? []).map((stage) => ({
      name: stage.name,
      status: stage.status,
      startedOn: stage.started_on,
      endedOn: stage.ended_on,
    })),
    trigger: {
      type: deployment_trigger?.type,
      branch: metadata?.branch,
    },
    commit: {
      hash: metadata?.commit_hash ?? '',
      message: metadata?.commit_message || `Deployment ${id.slice(0, 8)}`,
    },
    status: latest_stage?.status ?? 'unknown',
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
  };
}

function formatWorkerVersionDetail(
  item: WorkerVersionDetailItem,
): WorkerVersionDetail {
  const runtime = item.resources?.script_runtime;
  const script = item.resources?.script;
  return {
    id: item.id,
    number: item.number,
    createdOn: item.metadata?.created_on,
    modifiedOn: item.metadata?.modified_on,
    source: item.metadata?.source,
    authorEmail: item.metadata?.author_email,
    bindings: formatWorkerBindings(item.resources?.bindings),
    handlers: script?.handlers ?? [],
    namedHandlers: (script?.named_handlers ?? []).map((handler) => ({
      name: handler.name ?? 'Unnamed export',
      handlers: handler.handlers ?? [],
    })),
    lastDeployedFrom: script?.last_deployed_from,
    compatibilityDate: runtime?.compatibility_date,
    compatibilityFlags: runtime?.compatibility_flags ?? [],
    exports: Object.entries(runtime?.exports ?? {}).map(([name, value]) => ({
      name,
      type: value.type ?? 'unknown',
      state: value.state,
    })),
    cpuLimitMs: runtime?.limits?.cpu_ms,
    usageModel: runtime?.usage_model,
  };
}

function formatWorkerBindings(
  bindings: unknown,
): WorkerVersionDetail['bindings'] {
  if (Array.isArray(bindings)) {
    return bindings
      .filter((binding): binding is Record<string, unknown> =>
        Boolean(binding && typeof binding === 'object'),
      )
      .map((binding, index) => formatWorkerBinding(binding, String(index)));
  }
  if (bindings && typeof bindings === 'object') {
    return Object.entries(bindings).map(([name, value]) =>
      value && typeof value === 'object'
        ? formatWorkerBinding(value as Record<string, unknown>, name)
        : { name, type: typeof value },
    );
  }
  return [];
}

function formatWorkerBinding(
  binding: Record<string, unknown>,
  fallbackName: string,
): WorkerVersionDetail['bindings'][number] {
  const resourceKeys = [
    'namespace_id',
    'database_id',
    'bucket_name',
    'service',
    'queue_name',
    'dataset',
    'id',
  ];
  const resource = resourceKeys
    .map((key) => binding[key])
    .find((value): value is string => typeof value === 'string');
  return {
    name: typeof binding.name === 'string' ? binding.name : fallbackName,
    type: typeof binding.type === 'string' ? binding.type : 'unknown',
    resource,
  };
}

function formatWorker(item: WorkerItem): Worker {
  const {
    id,
    compatibility_date,
    compatibility_flags,
    created_on,
    handlers,
    modified_on,
    logpush,
    placement,
    usage_model,
    has_assets,
    has_modules,
  } = item;
  return {
    id,
    compatibilityDate: compatibility_date,
    compatibilityFlags: compatibility_flags ?? [],
    createdOn: created_on,
    handlers: handlers ?? [],
    modifiedOn: modified_on,
    logpush: logpush ?? false,
    placement: placement
      ? {
          mode: placement.mode,
          lastAnalyzedAt: placement.last_analyzed_at,
          status: placement.status,
        }
      : undefined,
    usageModel: usage_model,
    hasAssets: has_assets ?? false,
    hasModules: has_modules ?? false,
  };
}

export default Service;
export type {
  Account,
  AuditLog,
  CachePurgeResult,
  CertificatePack,
  Deployment,
  DeploymentStatus,
  DnsBatchOperations,
  DnsBatchResult,
  DnsImportResult,
  DnsRecord,
  DnsRecordCreate,
  DnsRecordUpdate,
  Dnssec,
  DnssecStatus,
  Domain,
  DomainStatus,
  Member,
  MemberStatus,
  Page,
  Source,
  Worker,
  WorkerDeployment,
  WorkerRoute,
  WorkerVersion,
  WorkerVersionDetail,
  Zone,
  ZoneAnalytics,
  ZoneSetting,
  ZoneSettingValue,
  ZoneStatus,
};
