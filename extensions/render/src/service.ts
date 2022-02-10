import axios, { AxiosError, AxiosInstance } from 'axios';

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

export class NetworkError extends Error {}

export class AuthError extends NetworkError {}

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
    try {
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
    } catch (e) {
      const error = e as AxiosError;
      const status = error.response?.status;
      if (!status) {
        throw new Error();
      }
      if (status !== 401) {
        throw new NetworkError();
      }
      throw new AuthError();
    }
  }

  async getServices(): Promise<ServiceResponse[]> {
    try {
      const { data } = await this.client.get<ServiceItemResponse[]>(
        '/services',
        {
          params: {
            limit: 100,
          },
        }
      );
      return data.map((item) => {
        return item.service;
      });
    } catch (e) {
      const error = e as AxiosError;
      const status = error.response?.status;
      if (!status) {
        throw new Error();
      }
      if (status !== 401) {
        throw new NetworkError();
      }
      throw new AuthError();
    }
  }

  async getService(id: string): Promise<ServiceResponse> {
    try {
      const { data } = await this.client.get<ServiceResponse>(
        `/services/${id}`
      );
      return data;
    } catch (e) {
      const error = e as AxiosError;
      const status = error.response?.status;
      if (!status) {
        throw new Error();
      }
      if (status !== 401) {
        throw new NetworkError();
      }
      throw new AuthError();
    }
  }

  async getDeploys(serviceId: string): Promise<DeployResponse[]> {
    try {
      const { data } = await this.client.get<DeployItemResponse[]>(
        `/services/${serviceId}/deploys`,
        {
          params: {
            limit: 100,
          },
        }
      );
      return data.map((item) => item.deploy);
    } catch (e) {
      const error = e as AxiosError;
      const status = error.response?.status;
      if (!status) {
        throw new Error();
      }
      if (status !== 401) {
        throw new NetworkError();
      }
      throw new AuthError();
    }
  }

  async getDeploy(serviceId: string, id: string): Promise<DeployResponse> {
    try {
      const { data } = await this.client.get<DeployResponse>(
        `/services/${serviceId}/deploys/${id}`
      );
      return data;
    } catch (e) {
      const error = e as AxiosError;
      const status = error.response?.status;
      if (!status) {
        throw new Error();
      }
      if (status !== 401) {
        throw new NetworkError();
      }
      throw new AuthError();
    }
  }

  async getEnvVariables(serviceId: string): Promise<EnvVariables> {
    try {
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
    } catch (e) {
      const error = e as AxiosError;
      const status = error.response?.status;
      if (!status) {
        throw new Error();
      }
      if (status !== 401) {
        throw new NetworkError();
      }
      throw new AuthError();
    }
  }

  async getDomains(serviceId: string): Promise<DomainResponse[]> {
    try {
      const { data } = await this.client.get<DomainItemResponse[]>(
        `/services/${serviceId}/custom-domains`,
        {
          params: {
            limit: 100,
          },
        }
      );
      return data.map((item) => item.customDomain);
    } catch (e) {
      const error = e as AxiosError;
      const status = error.response?.status;
      if (!status) {
        throw new Error();
      }
      if (status !== 401) {
        throw new NetworkError();
      }
      throw new AuthError();
    }
  }
}
