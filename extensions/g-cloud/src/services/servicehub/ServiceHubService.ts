import { executeGcloudCommand } from "../../gcloud";
import { getServiceInfo, GCPServiceCategory, getAllServices } from "../../utils/gcpServices";

export interface GCPService {
  name: string;
  displayName: string;
  description?: string;
  isEnabled: boolean;
  state?: string;
  dependsOn?: string[];
  category?: GCPServiceCategory;
  documentation?: string;
  console?: string;
  region?: string;
}

export interface ServiceEnableOptions {
  async?: boolean;
}

export interface ServiceListOptions {
  filter?: string;
  limit?: number;
  pageSize?: number;
  includeDisabled?: boolean;
  category?: GCPServiceCategory;
  useLocalOnly?: boolean;
  coreServicesOnly?: boolean;
}

const CORE_SERVICES = [
  "compute.googleapis.com",
  "container.googleapis.com",
  "run.googleapis.com",
  "cloudfunctions.googleapis.com",
  "appengine.googleapis.com",

  "storage.googleapis.com",
  "file.googleapis.com",

  "sqladmin.googleapis.com",
  "firestore.googleapis.com",
  "datastore.googleapis.com",
  "bigtable.googleapis.com",
  "spanner.googleapis.com",

  "iam.googleapis.com",
  "cloudkms.googleapis.com",
  "secretmanager.googleapis.com",

  "dns.googleapis.com",
  "networkservices.googleapis.com",
  "vpcaccess.googleapis.com",

  "cloudbuild.googleapis.com",
  "artifactregistry.googleapis.com",
  "containerregistry.googleapis.com",

  "bigquery.googleapis.com",
  "pubsub.googleapis.com",

  "monitoring.googleapis.com",
  "logging.googleapis.com",
  "cloudresourcemanager.googleapis.com",
];

export class ServiceHubService {
  private gcloudPath: string;
  private projectId: string;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 900000;
  private readonly CACHE_TTL_DETAILS = 1800000;
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

  constructor(gcloudPath: string, projectId: string) {
    this.gcloudPath = gcloudPath;
    this.projectId = projectId;
  }

  async listServices(options: ServiceListOptions = {}): Promise<GCPService[]> {
    const cacheKey = `services:${this.projectId}:${JSON.stringify(options)}`;

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<GCPService[]>;
    }

    const cachedData = this.cache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < this.CACHE_TTL) {
      return cachedData.data as GCPService[];
    }

    const requestPromise = this.fetchServices(options, cacheKey);

    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async fetchServices(options: ServiceListOptions, cacheKey: string): Promise<GCPService[]> {
    try {
      let allPredefinedServices = getAllServices();

      if (options.coreServicesOnly) {
        allPredefinedServices = allPredefinedServices.filter((service) => CORE_SERVICES.includes(service.name));
      }

      if (options.useLocalOnly) {
        const filteredServices = options.category
          ? allPredefinedServices.filter((service) => service.category === options.category)
          : allPredefinedServices;

        const formattedServices: GCPService[] = filteredServices.map((predefinedService) => {
          return {
            name: predefinedService.name,
            displayName: predefinedService.displayName,
            description: predefinedService.description,
            isEnabled: false,
            state: "UNKNOWN",
            category: predefinedService.category,
            documentation: predefinedService.documentation,
            console: predefinedService.console,
            dependsOn: predefinedService.dependsOn,
            region: predefinedService.region || "global",
          };
        });

        const now = Date.now();
        this.cache.set(cacheKey, { data: formattedServices, timestamp: now });

        return formattedServices;
      }

      const enabledServices = await this.getEnabledServices();

      const relevantPredefinedServices = options.category
        ? allPredefinedServices.filter((service) => service.category === options.category)
        : allPredefinedServices;

      const formattedServices: GCPService[] = relevantPredefinedServices.map((predefinedService) => {
        const isEnabled = enabledServices.includes(predefinedService.name);

        return {
          name: predefinedService.name,
          displayName: predefinedService.displayName,
          description: predefinedService.description,
          isEnabled: isEnabled,
          state: isEnabled ? "ENABLED" : "NOT_ACTIVATED",
          category: predefinedService.category,
          documentation: predefinedService.documentation,
          console: predefinedService.console,
          dependsOn: predefinedService.dependsOn,
          region: predefinedService.region || "global",
        };
      });

      const result = !options.includeDisabled
        ? formattedServices.filter((service) => service.isEnabled)
        : formattedServices;

      const now = Date.now();
      this.cache.set(cacheKey, { data: result, timestamp: now });

      return result;
    } catch (error: unknown) {
      console.error("Error listing services:", error);

      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        return cachedData.data as GCPService[];
      }

      if (error instanceof Error && error.message.includes("maxBuffer")) {
        return this.getLocalServices(options.category, options.coreServicesOnly);
      }

      throw new Error(`Failed to list services: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getEnabledServices(): Promise<string[]> {
    try {
      const cacheKey = `enabled-services:${this.projectId}`;

      const cachedData = this.cache.get(cacheKey);
      const now = Date.now();

      if (cachedData && now - cachedData.timestamp < this.CACHE_TTL) {
        return cachedData.data as string[];
      }

      const command = "services list --filter=state:ENABLED --limit=500 --format=json";
      const result = await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      const services = typeof result === "string" ? JSON.parse(result) : result;

      const enabledServices = services
        .map((service: unknown) => {
          if (typeof service === "string") {
            return service.endsWith(".googleapis.com") ? service : `${service}.googleapis.com`;
          }

          const svc = service as Record<string, unknown>;
          const name = (svc.name as string) || (svc.config as Record<string, string>)?.name;

          if (name && name.includes("/")) {
            const parts = name.split("/");
            return parts[parts.length - 1];
          }
          return name;
        })
        .filter(Boolean);

      this.cache.set(cacheKey, { data: enabledServices, timestamp: now });

      return enabledServices;
    } catch (error: unknown) {
      console.error("Error getting enabled services:", error);
      return [];
    }
  }

  private getLocalServices(category?: GCPServiceCategory, coreServicesOnly?: boolean): GCPService[] {
    let allPredefinedServices = getAllServices();

    if (coreServicesOnly) {
      allPredefinedServices = allPredefinedServices.filter((service) => CORE_SERVICES.includes(service.name));
    }

    const services = allPredefinedServices.map((service) => ({
      name: service.name,
      displayName: service.displayName,
      description: service.description,
      isEnabled: false,
      state: "UNKNOWN",
      category: service.category,
      documentation: service.documentation,
      console: service.console,
      dependsOn: service.dependsOn,
      region: service.region || "global",
    }));

    return category ? services.filter((service) => service.category === category) : services;
  }

  async enableService(serviceName: string, options: ServiceEnableOptions = {}): Promise<boolean> {
    try {
      let command = `services enable ${serviceName}`;

      if (options.async) {
        command += " --async";
      }

      await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      this.clearServiceCache();

      return true;
    } catch (error: unknown) {
      console.error(`Error enabling service ${serviceName}:`, error);
      throw new Error(
        `Failed to enable service ${serviceName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async disableService(serviceName: string, options: ServiceEnableOptions = {}): Promise<boolean> {
    try {
      let command = `services disable ${serviceName}`;

      if (options.async) {
        command += " --async";
      }

      await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      this.clearServiceCache();

      return true;
    } catch (error: unknown) {
      console.error(`Error disabling service ${serviceName}:`, error);
      throw new Error(
        `Failed to disable service ${serviceName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getServiceDetails(serviceName: string): Promise<GCPService> {
    const cacheKey = `service-details:${this.projectId}:${serviceName}`;

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<GCPService>;
    }

    const cachedData = this.cache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < this.CACHE_TTL_DETAILS) {
      return cachedData.data as GCPService;
    }

    const requestPromise = this.fetchServiceDetails(serviceName, cacheKey);

    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async fetchServiceDetails(serviceName: string, cacheKey: string): Promise<GCPService> {
    try {
      const serviceInfo = getServiceInfo(serviceName);

      const command = `services list --filter=name:${serviceName} --format=json`;
      const result = await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      const services = typeof result === "string" ? JSON.parse(result) : result;

      let isEnabled = false;
      let state = "NOT_ACTIVATED";

      if (services && services.length > 0) {
        const service = services[0];
        isEnabled = service.state === "ENABLED";
        state = service.state || "UNKNOWN";
      }

      const serviceDetails: GCPService = {
        name: serviceName,
        displayName: serviceInfo.displayName,
        description: serviceInfo.description,
        isEnabled: isEnabled,
        state: state,
        category: serviceInfo.category,
        documentation: serviceInfo.documentation,
        console: serviceInfo.console,
        dependsOn: serviceInfo.dependsOn,
        region: serviceInfo.region || "global",
      };

      const now = Date.now();
      this.cache.set(cacheKey, { data: serviceDetails, timestamp: now });

      return serviceDetails;
    } catch (error: unknown) {
      console.error(`Error fetching service details for ${serviceName}:`, error);

      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        return cachedData.data as GCPService;
      }

      const serviceInfo = getServiceInfo(serviceName);
      return {
        name: serviceName,
        displayName: serviceInfo.displayName,
        description: serviceInfo.description,
        isEnabled: false,
        state: "UNKNOWN",
        category: serviceInfo.category,
        documentation: serviceInfo.documentation,
        console: serviceInfo.console,
        dependsOn: serviceInfo.dependsOn,
        region: serviceInfo.region || "global",
      };
    }
  }

  private clearServiceCache(): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith("services:") || key.startsWith("service-details:") || key.startsWith("enabled-services:")) {
        this.cache.delete(key);
      }
    }
  }

  async isServiceEnabled(serviceName: string): Promise<boolean> {
    try {
      const detailsCacheKey = `service-details:${this.projectId}:${serviceName}`;
      const cachedDetails = this.cache.get(detailsCacheKey);
      const now = Date.now();

      if (cachedDetails && now - cachedDetails.timestamp < this.CACHE_TTL_DETAILS) {
        return (cachedDetails.data as GCPService).isEnabled;
      }

      const listCacheKey = `enabled-services:${this.projectId}`;
      const cachedList = this.cache.get(listCacheKey);

      if (cachedList && now - cachedList.timestamp < this.CACHE_TTL) {
        return (cachedList.data as string[]).includes(serviceName);
      }

      const command = `services list --filter=name:${serviceName} --filter=state:ENABLED --format=json`;
      const result = await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      const services = typeof result === "string" ? JSON.parse(result) : result;
      const isEnabled = services && services.length > 0;

      this.cache.set(detailsCacheKey, {
        data: {
          name: serviceName,
          displayName: getServiceInfo(serviceName).displayName,
          description: getServiceInfo(serviceName).description,
          isEnabled: isEnabled,
          state: isEnabled ? "ENABLED" : "NOT_ACTIVATED",
        },
        timestamp: now,
      });

      return isEnabled;
    } catch (error: unknown) {
      console.error(`Error checking if service ${serviceName} is enabled:`, error);

      try {
        const detailsCacheKey = `service-details:${this.projectId}:${serviceName}`;
        const cachedDetails = this.cache.get(detailsCacheKey);

        if (cachedDetails) {
          return (cachedDetails.data as GCPService).isEnabled;
        }

        const serviceDetails = await this.getServiceDetails(serviceName);
        return serviceDetails.isEnabled;
      } catch (error: unknown) {
        console.error(`Error getting service details for ${serviceName} during fallback:`, error);

        return false;
      }
    }
  }

  async getServicesByCategory(
    category: GCPServiceCategory,
    includeDisabled: boolean = true,
    coreServicesOnly: boolean = false,
  ): Promise<GCPService[]> {
    return this.listServices({
      category,
      includeDisabled,
      coreServicesOnly,
    });
  }

  async getAllCategories(): Promise<GCPServiceCategory[]> {
    return Object.values(GCPServiceCategory).sort();
  }
}
