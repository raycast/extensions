import axios, { AxiosInstance } from 'axios';

import { getPreferences } from './helpers';
import {
  AuditLog,
  Deploy,
  Domain,
  Member,
  Site,
  Team,
  User,
} from './interfaces';

class Api {
  client: AxiosInstance;

  constructor(apiToken: string) {
    this.client = axios.create({
      baseURL: 'https://api.netlify.com/api/v1',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'User-Agent': 'netlify-raycast-extension',
      },
    });
  }

  async getAuditLog(team: string): Promise<AuditLog[]> {
    const { data } = await this.client.get<AuditLog[]>(
      `/accounts/${team}/audit?page=1&per_page=200`,
    );
    return data;
  }

  async getDeploys(site: string): Promise<Deploy[]> {
    const { data } = await this.client.get<Deploy[]>(`/sites/${site}/deploys`);
    return data;
  }

  async getDomains(): Promise<Domain[]> {
    const { data } = await this.client.get<Domain[]>('/dns_zones');
    return data;
  }

  async getMembers(team: string): Promise<Member[]> {
    const { data } = await this.client.get<Member[]>(`/${team}/members`);
    return data;
  }

  async getSites(query: string, team?: string): Promise<Site[]> {
    const params = [
      `name=${query}`,
      `filter=all`,
      `sort_by=updated_at`,
      `page=1`,
      `per_page=30`,
      `include_favorites=true`,
    ];
    const path = [team && `/${team}`, `/sites?${params.join('&')}`]
      .filter(Boolean)
      .join('');
    const { data } = await this.client.get<Site[]>(path);
    return data;
  }

  async getTeams(): Promise<Team[]> {
    const { data } = await this.client.get<Team[]>(`/accounts`);
    return data;
  }

  async getUser(): Promise<User> {
    const { data } = await this.client.get<User>(`/user`);
    return data;
  }

  async saveFavorites(favorites: string[]): Promise<User> {
    const { data } = await this.client.put<User>(`/user`, {
      favorite_sites: favorites,
    });
    return data;
  }
}

const { token } = getPreferences();
const api = new Api(token);

export default api;
