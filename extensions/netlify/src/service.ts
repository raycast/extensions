import axios, { AxiosInstance } from 'axios';

export interface Site {
  account_name: string;
  account_slug: string;
  build_settings: {
    repo_url: string;
    stop_builds: boolean;
    env: Record<string, string>;
  };
  created_at: string;
  id: string;
  name: string;
  published_deploy: {
    published_at: string;
  };
  screenshot_url: string;
  ssl_url: string;
}

export type DeployState =
  | 'retrying' // 0
  | 'new' // 0
  | 'pending_review' // 0
  | 'accepted' // 0
  | 'enqueued' // 0
  | 'building' // 25
  | 'uploading' // 50
  | 'uploaded' // 50
  | 'preparing' // 75
  | 'prepared' // 75
  | 'processing' // 100
  | 'error' // cross
  | 'rejected' // cross
  | 'skipped' // cross
  | 'cancelled' // cross
  | 'deleted' // cross
  | 'ready'; // check

export interface Deploy {
  branch: string;
  commit_ref?: string;
  commit_url?: string;
  committer?: string;
  context: 'production' | 'deploy-preview' | 'branch-deploy';
  created_at: string;
  deploy_time: number;
  deploy_ssl_url: string;
  id: string;
  links: {
    alias: string;
    branch?: string;
    permalink: string;
  };
  review_id: number;
  review_url: string;
  site_id: string;
  state: DeployState;
  title?: string;
  url: string;
}

interface DnsResponse {
  name: string;
  account_slug: string;
  account_name: string;
}

export interface Domain {
  value: string;
  team: {
    id: string;
    name: string;
  };
}

interface TeamResponse {
  name: string;
  slug: string;
}

export interface Team {
  id: string;
  name: string;
}

interface MemberResponse {
  email: string;
  id: string;
  full_name: string;
  role: string;
}

export interface Member {
  email: string;
  id: string;
  name: string;
  role: string;
}

class Service {
  client: AxiosInstance;

  constructor(apiToken: string) {
    this.client = axios.create({
      baseURL: 'https://api.netlify.com/api/v1',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });
  }

  async getSites(): Promise<Site[]> {
    const { data } = await this.client.get<Site[]>(
      '/sites?filter=all&sort_by=updated_at&include_favorites=true',
    );
    return data;
  }

  async getDeploys(site: string): Promise<Deploy[]> {
    const { data } = await this.client.get<Deploy[]>(`/sites/${site}/deploys`);
    return data;
  }

  async getDomains(): Promise<Domain[]> {
    const response = await this.client.get<DnsResponse[]>('/dns_zones');

    return response.data.map((item) => {
      return {
        value: item.name,
        team: {
          id: item.account_slug,
          name: item.account_name,
        },
      };
    });
  }

  async getTeams(): Promise<Team[]> {
    const response = await this.client.get<TeamResponse[]>(`/accounts`);

    return response.data.map((item) => {
      return {
        id: item.slug,
        name: item.name,
      };
    });
  }

  async getMembers(team: string): Promise<Member[]> {
    const response = await this.client.get<MemberResponse[]>(
      `/${team}/members`,
    );

    return response.data.map((item) => {
      return {
        email: item.email,
        id: item.id,
        name: item.full_name,
        role: item.role,
      };
    });
  }
}

export default Service;
