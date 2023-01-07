import axios, { AxiosInstance } from 'axios';

<<<<<<< HEAD
import {
  AuditLog,
  Committer,
  Deploy,
  Domain,
  Member,
  Reviewer,
=======
import { getPreferences } from './helpers';
import {
  AuditLog,
  Deploy,
  Domain,
  Member,
>>>>>>> netlify/find-sites-on-disk
  Site,
  Team,
  User,
} from './interfaces';
<<<<<<< HEAD
import { getToken } from './utils';
=======
>>>>>>> netlify/find-sites-on-disk

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

<<<<<<< HEAD
  async getCommitters(team: string): Promise<Committer[]> {
    const { data } = await this.client.get<Committer[]>(`/${team}/committers`);
    return data;
  }

=======
>>>>>>> netlify/find-sites-on-disk
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

<<<<<<< HEAD
  async getReviewers(team: string): Promise<Reviewer[]> {
    const { data } = await this.client.get<Reviewer[]>(`/${team}/reviewers`);
    return data;
  }

=======
>>>>>>> netlify/find-sites-on-disk
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

<<<<<<< HEAD
const api = new Api(getToken());
=======
const { token } = getPreferences();
const api = new Api(token);
>>>>>>> netlify/find-sites-on-disk

export default api;
