import axios, { AxiosInstance } from "axios";

interface SiteItemResponse {
  id: string;
  name: string;
  url: string;
  account_slug: string;
  account_name: string;
  build_settings: {
    repo_url: string;
  };
}

export interface SiteItem {
  id: string;
  name: string;
  siteUrl: string;
  repositoryUrl: string;
  team: {
    id: string;
    name: string;
  };
}

interface SiteResponse {
  id: string;
  name: string;
  url: string;
  build_settings: {
    repo_url: string;
    stop_builds: boolean;
    env: Record<string, string>;
  };
  published_deploy: {
    published_at: string;
  };
  created_at: string;
}

export interface Site {
  id: string;
  name: string;
  siteUrl: string;
  repositoryUrl: string;
  publishDate: Date;
  createDate: Date;
  isAutoPublishEnabled: boolean;
  environmentVariables: Record<string, string>;
}

interface DeployItemResponse {
  id: string;
  title: string;
  site_id: string;
  error_message?: string;
  skipped?: boolean;
}

export type DeployStatus = "ok" | "skipped" | "error";

export interface DeployItem {
  id: string;
  name: string;
  siteId: string;
  status: DeployStatus;
}

interface DeploySummaryMessage {
  type: string;
  title: string;
  description: string;
  details: string;
}

type DeploySummary = DeploySummaryMessage[];

interface DeployResponse {
  id: string;
  name: string;
  title?: string;
  site_id: string;
  url: string;
  created_at: string;
  committer?: string;
  commit_url: string;
  error_message?: string;
  skipped?: boolean;
  summary: {
    messages: DeploySummary;
  };
  links: {
    permalink: string;
  };
}

export interface Deploy {
  id: string;
  name: string;
  site: {
    id: string;
    name: string;
  };
  url: string;
  author?: string;
  publishDate: Date;
  status: DeployStatus;
  summary: DeploySummary;
  siteUrl: string;
  commitUrl: string;
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
  id: string;
  full_name: string;
  role: string;
}

export interface Member {
  id: string;
  name: string;
  role: string;
}

class Service {
  client: AxiosInstance;

  constructor(apiToken: string) {
    this.client = axios.create({
      baseURL: "https://api.netlify.com/api/v1",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });
  }

  async getSites(): Promise<SiteItem[]> {
    const response = await this.client.get<SiteItemResponse[]>("/sites");
    return response.data.map((item) => {
      return {
        id: item.id,
        name: item.name,
        siteUrl: item.url,
        repositoryUrl: item.build_settings.repo_url,
        team: {
          id: item.account_slug,
          name: item.account_name,
        },
      };
    });
  }

  async getSite(id: string): Promise<Site> {
    const { data } = await this.client.get<SiteResponse>(`/sites/${id}`);
    return {
      id,
      name: data.name,
      siteUrl: data.url,
      repositoryUrl: data.build_settings.repo_url,
      publishDate: new Date(data.published_deploy.published_at),
      createDate: new Date(data.created_at),
      isAutoPublishEnabled: !data.build_settings.stop_builds,
      environmentVariables: data.build_settings.env,
    };
  }

  async getDeploys(site: string): Promise<DeployItem[]> {
    const response = await this.client.get<DeployItemResponse[]>(`/sites/${site}/deploys`);
    return response.data.map((item) => {
      return {
        id: item.id,
        name: item.title || "No deploy message",
        siteId: item.site_id,
        status: getDeployStatus(item.error_message, item.skipped),
      };
    });
  }

  async getDeploy(siteId: string, deployId: string): Promise<Deploy> {
    const { data } = await this.client.get<DeployResponse>(`/sites/${siteId}/deploys/${deployId}`);

    return {
      id: deployId,
      name: data.title || "No deploy message",
      site: {
        id: data.site_id,
        name: data.name,
      },
      url: data.url,
      author: data.committer,
      publishDate: new Date(data.created_at),
      status: getDeployStatus(data.error_message, data.skipped),
      summary: data.summary.messages,
      siteUrl: data.links.permalink,
      commitUrl: data.commit_url,
    };
  }

  async getDomains(): Promise<Domain[]> {
    const response = await this.client.get<DnsResponse[]>("/dns_zones");

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
    const response = await this.client.get<MemberResponse[]>(`/${team}/members`);

    return response.data.map((item) => {
      return {
        id: item.id,
        name: item.full_name,
        role: item.role,
      };
    });
  }
}

function getDeployStatus(error?: string, skipped?: boolean): DeployStatus {
  return !error ? "ok" : skipped ? "skipped" : "error";
}

export default Service;
