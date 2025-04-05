/**
 * ServiceHub Service - Centralizes management of Google Cloud service activation
 * Provides a unified interface for enabling and disabling GCP services
 */

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

// Core services that are most commonly used
const CORE_SERVICES = [
  // Compute
  "compute.googleapis.com",
  "container.googleapis.com",
  "run.googleapis.com",
  "cloudfunctions.googleapis.com",
  "appengine.googleapis.com",

  // Storage
  "storage.googleapis.com",
  "file.googleapis.com",

  // Database
  "sqladmin.googleapis.com",
  "firestore.googleapis.com",
  "datastore.googleapis.com",
  "bigtable.googleapis.com",
  "spanner.googleapis.com",

  // Security & IAM
  "iam.googleapis.com",
  "cloudkms.googleapis.com",
  "secretmanager.googleapis.com",

  // Networking
  "dns.googleapis.com",
  "networkservices.googleapis.com",
  "vpcaccess.googleapis.com",

  // DevOps
  "cloudbuild.googleapis.com",
  "artifactregistry.googleapis.com",
  "containerregistry.googleapis.com",

  // Analytics
  "bigquery.googleapis.com",
  "pubsub.googleapis.com",

  // Management
  "monitoring.googleapis.com",
  "logging.googleapis.com",
  "cloudresourcemanager.googleapis.com",
];

export class ServiceHubService {
  private gcloudPath: string;
  private projectId: string;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 900000; // 15 minutes cache TTL (increased from 5 minutes)
  private readonly CACHE_TTL_DETAILS = 1800000; // 30 minutes cache TTL for details (increased from 10 minutes)
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

  constructor(gcloudPath: string, projectId: string) {
    this.gcloudPath = gcloudPath;
    this.projectId = projectId;
  }

  /**
   * List available services in Google Cloud
   */
  async listServices(options: ServiceListOptions = {}): Promise<GCPService[]> {
    const cacheKey = `services:${this.projectId}:${JSON.stringify(options)}`;

    // Check if there's a pending request for this exact query
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<GCPService[]>;
    }

    // Check cache
    const cachedData = this.cache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < this.CACHE_TTL) {
      return cachedData.data as GCPService[];
    }

    // Create the promise for this request
    const requestPromise = this.fetchServices(options, cacheKey);

    // Store the promise so parallel calls can use it
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      // Clean up the pending request
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Actual implementation of fetching services
   */
  private async fetchServices(options: ServiceListOptions, cacheKey: string): Promise<GCPService[]> {
    try {
      // Get all predefined services from our utility
      let allPredefinedServices = getAllServices();

      // Filter to core services if requested
      if (options.coreServicesOnly) {
        allPredefinedServices = allPredefinedServices.filter((service) => CORE_SERVICES.includes(service.name));
      }

      // If useLocalOnly is true, just use the predefined services without API call
      if (options.useLocalOnly) {
        // If category is specified, filter predefined services by category
        const filteredServices = options.category
          ? allPredefinedServices.filter((service) => service.category === options.category)
          : allPredefinedServices;

        const formattedServices: GCPService[] = filteredServices.map((predefinedService) => {
          return {
            name: predefinedService.name,
            displayName: predefinedService.displayName,
            description: predefinedService.description,
            isEnabled: false, // We don't know without API call
            state: "UNKNOWN",
            category: predefinedService.category,
            documentation: predefinedService.documentation,
            console: predefinedService.console,
            dependsOn: predefinedService.dependsOn,
            region: predefinedService.region || "global",
          };
        });

        // Store in cache
        const now = Date.now();
        this.cache.set(cacheKey, { data: formattedServices, timestamp: now });

        return formattedServices;
      }

      // Get the actual enabled services from the project
      const enabledServices = await this.getEnabledServices();

      // Get the relevant predefined services based on category
      const relevantPredefinedServices = options.category
        ? allPredefinedServices.filter((service) => service.category === options.category)
        : allPredefinedServices;

      // Combine with enabled status
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

      // Apply active only filter if needed
      const result = !options.includeDisabled
        ? formattedServices.filter((service) => service.isEnabled)
        : formattedServices;

      // Store in cache
      const now = Date.now();
      this.cache.set(cacheKey, { data: result, timestamp: now });

      return result;
    } catch (error: unknown) {
      console.error("Error listing services:", error);

      // On error, try to return cached data even if expired
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        // console.log("Returning expired cached data due to error");
        return cachedData.data as GCPService[];
      }

      // If no cached data, return predefined services as fallback
      if (error instanceof Error && error.message.includes("maxBuffer")) {
        // console.log("Buffer exceeded, falling back to predefined services");
        return this.getLocalServices(options.category, options.coreServicesOnly);
      }

      throw new Error(`Failed to list services: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get enabled services in the current project
   * This is a direct API call to get accurate status
   */
  private async getEnabledServices(): Promise<string[]> {
    try {
      // Cache key for enabled services list
      const cacheKey = `enabled-services:${this.projectId}`;

      // Check cache first before making API call
      const cachedData = this.cache.get(cacheKey);
      const now = Date.now();

      if (cachedData && now - cachedData.timestamp < this.CACHE_TTL) {
        return cachedData.data as string[];
      }

      // Use a simple command to get only enabled services with a higher limit
      const command = "services list --filter=state:ENABLED --limit=500 --format=json";
      const result = await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      // Parse JSON result if it's a string
      const services = typeof result === "string" ? JSON.parse(result) : result;

      // Extract service names
      const enabledServices = services
        .map((service: unknown) => {
          // Handle different response formats
          if (typeof service === "string") {
            return service.endsWith(".googleapis.com") ? service : `${service}.googleapis.com`;
          }

          // Cast to any here since we're checking dynamically for properties
          const svc = service as Record<string, unknown>;
          const name = (svc.name as string) || (svc.config as Record<string, string>)?.name;

          if (name && name.includes("/")) {
            // Extract just the service name from paths like "projects/123/services/compute.googleapis.com"
            const parts = name.split("/");
            return parts[parts.length - 1];
          }
          return name;
        })
        .filter(Boolean);

      // Store in cache
      this.cache.set(cacheKey, { data: enabledServices, timestamp: now });

      return enabledServices;
    } catch (error: unknown) {
      console.error("Error getting enabled services:", error);
      return [];
    }
  }

  /**
   * Get local services without API call
   */
  private getLocalServices(category?: GCPServiceCategory, coreServicesOnly?: boolean): GCPService[] {
    let allPredefinedServices = getAllServices();

    // Filter to core services if requested
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

  /**
   * Enable a Google Cloud service
   */
  async enableService(serviceName: string, options: ServiceEnableOptions = {}): Promise<boolean> {
    try {
      let command = `services enable ${serviceName}`;

      if (options.async) {
        command += " --async";
      }

      await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      // Clear cache after enabling a service
      this.clearServiceCache();

      return true;
    } catch (error: unknown) {
      console.error(`Error enabling service ${serviceName}:`, error);
      throw new Error(
        `Failed to enable service ${serviceName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disable a Google Cloud service
   */
  async disableService(serviceName: string, options: ServiceEnableOptions = {}): Promise<boolean> {
    try {
      let command = `services disable ${serviceName}`;

      if (options.async) {
        command += " --async";
      }

      await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      // Clear cache after disabling a service
      this.clearServiceCache();

      return true;
    } catch (error: unknown) {
      console.error(`Error disabling service ${serviceName}:`, error);
      throw new Error(
        `Failed to disable service ${serviceName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get details about a specific service
   */
  async getServiceDetails(serviceName: string): Promise<GCPService> {
    const cacheKey = `service-details:${this.projectId}:${serviceName}`;

    // Check if there's a pending request for this service
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<GCPService>;
    }

    // Check cache
    const cachedData = this.cache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < this.CACHE_TTL_DETAILS) {
      return cachedData.data as GCPService;
    }

    // Create the promise for this request
    const requestPromise = this.fetchServiceDetails(serviceName, cacheKey);

    // Store the promise so parallel calls can use it
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      // Clean up the pending request
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Actual implementation of fetching service details
   */
  private async fetchServiceDetails(serviceName: string, cacheKey: string): Promise<GCPService> {
    try {
      // Get service info from predefined services
      const serviceInfo = getServiceInfo(serviceName);

      // Check if service is enabled with a direct query
      // This is more accurate than the list approach
      const command = `services list --filter=name:${serviceName} --format=json`;
      const result = await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      // Parse JSON result if it's a string
      const services = typeof result === "string" ? JSON.parse(result) : result;

      let isEnabled = false;
      let state = "NOT_ACTIVATED";

      if (services && services.length > 0) {
        const service = services[0];
        isEnabled = service.state === "ENABLED";
        state = service.state || "UNKNOWN";
      }

      // Combine information
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

      // Store in cache
      const now = Date.now();
      this.cache.set(cacheKey, { data: serviceDetails, timestamp: now });

      return serviceDetails;
    } catch (error: unknown) {
      console.error(`Error fetching service details for ${serviceName}:`, error);

      // Try to return cached data even if expired
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        // console.log("Returning expired cached data due to error");
        return cachedData.data as GCPService;
      }

      // If no cached data, return basic info from predefined services
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

  /**
   * Clear service cache
   */
  private clearServiceCache(): void {
    // Clear all cache entries that start with "services:" or "service-details:"
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith("services:") || key.startsWith("service-details:") || key.startsWith("enabled-services:")) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Check if a service is enabled
   */
  async isServiceEnabled(serviceName: string): Promise<boolean> {
    try {
      // Check if we already have this information in cache
      // First check the service details cache
      const detailsCacheKey = `service-details:${this.projectId}:${serviceName}`;
      const cachedDetails = this.cache.get(detailsCacheKey);
      const now = Date.now();

      if (cachedDetails && now - cachedDetails.timestamp < this.CACHE_TTL_DETAILS) {
        return (cachedDetails.data as GCPService).isEnabled;
      }

      // Then check the enabled services list cache
      const listCacheKey = `enabled-services:${this.projectId}`;
      const cachedList = this.cache.get(listCacheKey);

      if (cachedList && now - cachedList.timestamp < this.CACHE_TTL) {
        return (cachedList.data as string[]).includes(serviceName);
      }

      // If not in cache, make a direct API call
      const command = `services list --filter=name:${serviceName} --filter=state:ENABLED --format=json`;
      const result = await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      // Parse JSON result if it's a string
      const services = typeof result === "string" ? JSON.parse(result) : result;
      const isEnabled = services && services.length > 0;

      // Cache this result in service details format
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

      // Fallback to cached details even if expired
      try {
        const detailsCacheKey = `service-details:${this.projectId}:${serviceName}`;
        const cachedDetails = this.cache.get(detailsCacheKey);

        if (cachedDetails) {
          return (cachedDetails.data as GCPService).isEnabled;
        }

        // If still no cached data, try to get fresh details
        const serviceDetails = await this.getServiceDetails(serviceName);
        return serviceDetails.isEnabled;
      } catch (error: unknown) {
        console.error(`Error getting service details for ${serviceName} during fallback:`, error);
        // Return false as a safe default when all attempts to check service status fail
        return false;
      }
    }
  }

  /**
   * Get services by category
   * @param category The category to filter by
   * @param includeDisabled Whether to include disabled services
   * @param coreServicesOnly Whether to only include core services
   * @returns Array of services in the specified category
   */
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

  /**
   * Get all available categories
   */
  async getAllCategories(): Promise<GCPServiceCategory[]> {
    return Object.values(GCPServiceCategory).sort();
  }
}
