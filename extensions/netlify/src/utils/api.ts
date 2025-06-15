import axios, { AxiosInstance } from 'axios';

import {
  AlgoliaHit,
  AuditLog,
  Committer,
  CreateDNSRecord,
  DNSRecord,
  Deploy,
  Domain,
  DomainSearch,
  EnvVar,
  Member,
  Reviewer,
  Role,
  Site,
  Team,
  User,
} from './interfaces';
import {
  ALGOLIA_APP_ID,
  ALGOLIA_INDEX_NAME,
  ALGOLIA_PUBLIC_API_KEY,
  API_TOKEN,
} from './constants';
import { parseLinkHeader } from '@web3-storage/parse-link-header';

class Api {
  algolia: AxiosInstance;
  netlify: AxiosInstance;

  constructor(apiToken: string) {
    this.algolia = axios.create({
      baseURL: `https://${ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'netlify-raycast-extension',
      },
    });
    this.netlify = axios.create({
      baseURL: 'https://api.netlify.com/api/v1',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'User-Agent': 'netlify-raycast-extension',
      },
    });
  }

  async getAuditLog(team: string): Promise<AuditLog[]> {
    const { data } = await this.netlify.get<AuditLog[]>(
      `/accounts/${team}/audit?page=1&per_page=100`,
    );
    return data;
  }

  async getCommitters(team: string): Promise<Committer[]> {
    const { data } = await this.netlify.get<Committer[]>(`/${team}/committers`);
    return data;
  }

  async getDeploys(site: string): Promise<Deploy[]> {
    const { data } = await this.netlify.get<Deploy[]>(`/sites/${site}/deploys`);
    return data;
  }

  async getEnvVars(site: string): Promise<EnvVar[]> {
    const { data } = await this.netlify.get<EnvVar[]>(`/sites/${site}/env`);
    return data;
  }

  async getDomains(team?: string): Promise<Domain[]> {
    const params = team ? `?account_slug=${team}` : '';
    const { data } = await this.netlify.get<Domain[]>(`/dns_zones${params}`);
    return data;
  }

  async getDNSRecords(zoneId: string): Promise<DNSRecord[]> {
    const { data } = await this.netlify.get<DNSRecord[]>(
      `/dns_zones/${zoneId}/dns_records`,
    );
    return data;
  }

  async createDNSRecord(
    zoneId: string,
    body: CreateDNSRecord,
  ): Promise<DNSRecord> {
    const { data } = await this.netlify.post(
      `/dns_zones/${zoneId}/dns_records`,
      body,
    );
    return data;
  }

  async deleteDNSRecord(zoneId: string, recordId: string) {
    const { data } = await this.netlify.delete(
      `/dns_zones/${zoneId}/dns_records/${recordId}`,
    );
    return data;
  }

  async searchDomains(query: string, team: string): Promise<DomainSearch[]> {
    const TLDs = ['com', 'org', 'net', 'dev', 'io'];
    const domains = query.includes('.')
      ? [query]
      : TLDs.map((tld) => `${query}.${tld}`);
    const promises = domains.map((domain) => {
      const params = [`account_id=${team}`, `domain=${domain}`];
      return this.netlify.get<DomainSearch>(
        `/domains-next/search?${params.join('&')}`,
      );
    });
    const responses = await Promise.all(promises);
    return responses.map(({ data }, i) => ({
      ...data,
      name: domains[i],
    }));
  }

  async buyDomain(domain: string, team: string): Promise<DomainSearch> {
    const body = { domain, account_id: team };
    const { data } = await this.netlify.post(`/domains-next`, body);
    return data;
  }

  async getMembers(team: string): Promise<Member[]> {
    const { data } = await this.netlify.get<Member[]>(`/${team}/members`);
    return data;
  }

  async addMember(payload: {
    email: string;
    role: Role;
    site_access: 'all' | 'selected';
    site_ids: string[];
    team: string;
  }): Promise<Member[]> {
    const { team, ...rest } = payload;
    const { data } = await this.netlify.post(`/${team}/members`, rest);
    return data;
  }

  async getReviewers(team: string): Promise<Reviewer[]> {
    const { data } = await this.netlify.get<Reviewer[]>(`/${team}/reviewers`);
    return data;
  }

  async getSites(
    query: string,
    team?: string,
    page = 1,
  ): Promise<{ data: Site[]; hasMore: boolean }> {
    const params = [
      `name=${query}`,
      `filter=all`,
      `sort_by=updated_at`,
      `page=${page}`,
      `per_page=100`,
      `include_favorites=true`,
    ];
    const path = [team && `/${team}`, `/sites?${params.join('&')}`]
      .filter(Boolean)
      .join('');
    const { data, headers } = await this.netlify.get<Site[]>(path);
    const parsed = parseLinkHeader(headers.link);
    const hasMore = !!parsed?.next;
    return { data, hasMore };
  }

  async getTeams(): Promise<Team[]> {
    const { data } = await this.netlify.get<Team[]>(`/accounts`);
    return data;
  }

  async getUser(): Promise<User> {
    const { data } = await this.netlify.get<User>(`/user`);
    return data;
  }

  async saveFavorites(favorites: string[]): Promise<User> {
    const { data } = await this.netlify.put<User>(`/user`, {
      favorite_sites: favorites,
    });
    return data;
  }

  async searchDocs(query: string, limit = 20): Promise<AlgoliaHit[]> {
    const params = [
      `x-algolia-application-id=${ALGOLIA_APP_ID}`,
      `x-algolia-api-key=${ALGOLIA_PUBLIC_API_KEY}`,
    ].join('&');
    const body = {
      indexName: ALGOLIA_INDEX_NAME,
      params: `query=in+the+docs+${query}&hitsPerPage=${limit}`,
    };
    const { data } = await this.algolia.post(
      `/indexes/*/queries?${params}`,
      JSON.stringify({ requests: [body] }),
    );
    return data.results[0].hits;
  }
}

const api = new Api(API_TOKEN);

export default api;
