import axios, { AxiosInstance } from 'axios';

import { Deploy, Domain, Member, Site, Team, User } from './interfaces';

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

  async getSites(query: string): Promise<Site[]> {
    const { data } = await this.client.get<Site[]>(
      `/sites?name=${query}&filter=all&sort_by=updated_at&include_favorites=true`,
    );
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
}

export default Api;
