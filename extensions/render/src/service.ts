import axios, { AxiosInstance } from 'axios';

interface OwnerResponse {
  cursor: string;
  owner: {
    id: string;
    name: string;
    email: string;
    type: 'user' | 'team';
  };
}

export interface Owner {
  id: string;
  name: string;
  type: 'user' | 'team';
}

interface ServiceItemResponse {
  cursor: string;
  service: ServiceResponse;
}

interface BaseServiceResponse {
  id: string;
  name: string;
  ownerId: string;
  repo: string;
  updatedAt: string;
}

interface StaticSiteServiceResponse extends BaseServiceResponse {
  type: 'static_site';
  serviceDetails: {
    url: string;
  };
}

interface WebServiceResponse extends BaseServiceResponse {
  type: 'web_service';
  serviceDetails: {
    env: string;
    url: string;
  };
}

interface PrivateServiceResponse extends BaseServiceResponse {
  type: 'private_service';
  serviceDetails: {
    env: string;
    url: string;
  };
}

interface BackgroundWorkerServiceResponse extends BaseServiceResponse {
  type: 'background_worker';
  serviceDetails: {
    env: string;
  };
}

interface CronJobServiceResponse extends BaseServiceResponse {
  type: 'cron_job';
  serviceDetails: {
    env: string;
    lastSuccessfulRunAt?: string;
    schedule: string;
  };
}

export type ServiceResponse =
  | StaticSiteServiceResponse
  | WebServiceResponse
  | PrivateServiceResponse
  | BackgroundWorkerServiceResponse
  | CronJobServiceResponse;

interface DeployItemResponse {
  deploy: DeployResponse;
  cursor: string;
}

export type DeployStatus = 'live' | 'deactivated' | 'canceled' | 'build_failed';

export interface DeployResponse {
  id: string;
  commit: {
    id: string;
    message: string;
  };
  status: DeployStatus;
  finishedAt: string;
}

interface EnvVariableItemResponse {
  envVar: {
    key: string;
    value: string;
  };
  cursor: string;
}

export type EnvVariables = Record<string, string>;

interface DomainItemResponse {
  customDomain: DomainResponse;
  cursor: string;
}

export interface DomainResponse {
  name: string;
  verified: boolean;
}

export default class Service {
  client: AxiosInstance;

  constructor(key: string) {
    this.client = axios.create({
      baseURL: 'https://api.render.com/v1',
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
  }

  async getOwners(): Promise<Owner[]> {
    const { data } = await this.client.get<OwnerResponse[]>('/owners', {
      params: {
        limit: 100,
      },
    });

    return data.map((item) => {
      const { id, name, type } = item.owner;
      return {
        id,
        name,
        type,
      };
    });
  }

  async getServices(): Promise<ServiceResponse[]> {
    const { data } = await this.client.get<ServiceItemResponse[]>('/services', {
      params: {
        limit: 100,
      },
    });
    return data.map((item) => {
      return item.service;
    });
  }

  async getService(id: string): Promise<ServiceResponse> {
    const { data } = await this.client.get<ServiceResponse>(`/services/${id}`);
    return data;
  }

  async getDeploys(serviceId: string): Promise<DeployResponse[]> {
    const { data } = await this.client.get<DeployItemResponse[]>(
      `/services/${serviceId}/deploys`,
      {
        params: {
          limit: 100,
        },
      }
    );
    return data.map((item) => item.deploy);
  }

  async getDeploy(serviceId: string, id: string): Promise<DeployResponse> {
    const { data } = await this.client.get<DeployResponse>(
      `/services/${serviceId}/deploys/${id}`
    );
    return data;
  }

  async getEnvVariables(serviceId: string): Promise<EnvVariables> {
    const { data } = await this.client.get<EnvVariableItemResponse[]>(
      `/services/${serviceId}/env-vars`,
      {
        params: {
          limit: 100,
        },
      }
    );
    return Object.fromEntries(
      data.map((item) => [item.envVar.key, item.envVar.value])
    );
  }

  async getDomains(serviceId: string): Promise<DomainResponse[]> {
    const { data } = await this.client.get<DomainItemResponse[]>(
      `/services/${serviceId}/custom-domains`,
      {
        params: {
          limit: 100,
        },
      }
    );
    return data.map((item) => item.customDomain);
  }
}
