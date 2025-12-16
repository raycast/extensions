/**
 * Compute Service - Provides efficient access to Google Cloud Compute Engine functionality
 * Uses REST APIs for improved performance (no CLI subprocess overhead)
 */

import { showFailureToast } from "@raycast/utils";
import {
  listComputeInstances,
  getComputeInstance,
  startComputeInstance,
  stopComputeInstance,
  listComputeZones,
  listComputeDisks,
  type ComputeInstance as ApiComputeInstance,
  type ComputeDisk as ApiComputeDisk,
} from "../../utils/gcpApi";

// Interfaces
export interface ComputeInstance {
  id: string;
  name: string;
  zone: string;
  machineType: string;
  status: string;
  cpuPlatform: string;
  networkInterfaces: NetworkInterface[];
  disks: AttachedDisk[];
  creationTimestamp: string;
  tags?: {
    items?: string[];
  };
  labels?: Record<string, string>;
  metadata?: {
    items?: MetadataItem[];
  };
  scheduling?: {
    automaticRestart?: boolean;
    onHostMaintenance?: string;
    preemptible?: boolean;
  };
  serviceAccounts?: ServiceAccount[];
}

export interface NetworkInterface {
  networkIP: string;
  network: string;
  subnetwork?: string;
  accessConfigs?: {
    natIP?: string;
    type?: string;
    name?: string;
  }[];
}

export interface AttachedDisk {
  deviceName: string;
  index: number;
  boot: boolean;
  kind: string;
  mode: string;
  source: string;
  type: string;
  autoDelete?: boolean;
  interface?: string;
}

export interface Disk {
  id: string;
  name: string;
  sizeGb: string;
  zone: string;
  status: string;
  sourceImage?: string;
  type: string;
  creationTimestamp: string;
  users?: string[];
  physicalBlockSizeBytes?: string;
  sourceImageId?: string;
  description?: string;
  labels?: Record<string, string>;
}

export interface MetadataItem {
  key: string;
  value: string;
}

export interface ServiceAccount {
  email: string;
  scopes: string[];
}

/**
 * Compute Service class - provides optimized access to Compute Engine functionality
 * Now uses REST APIs instead of gcloud CLI for better performance
 */
export class ComputeService {
  private gcloudPath: string;
  private projectId: string;
  private vmCache: Map<string, { data: ComputeInstance[]; timestamp: number }> = new Map();
  private diskCache: Map<string, { data: Disk[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes cache TTL

  // Static cache shared between instances for improved performance
  private static zonesCache: { zones: string[]; timestamp: number } | null = null;
  private static readonly ZONES_CACHE_TTL = 3600000; // 1 hour for zones cache

  constructor(gcloudPath: string, projectId: string) {
    this.gcloudPath = gcloudPath;
    this.projectId = projectId;
  }

  /**
   * Convert API response to internal format
   */
  private convertInstance(apiInstance: ApiComputeInstance): ComputeInstance {
    return {
      id: apiInstance.id,
      name: apiInstance.name,
      zone: apiInstance.zone,
      machineType: apiInstance.machineType,
      status: apiInstance.status,
      cpuPlatform: apiInstance.cpuPlatform || "",
      networkInterfaces: (apiInstance.networkInterfaces || []).map((ni) => ({
        networkIP: ni.networkIP,
        network: ni.network,
        accessConfigs: ni.accessConfigs?.map((ac) => ({
          natIP: ac.natIP,
          type: ac.type,
        })),
      })),
      disks: (apiInstance.disks || []).map((d, index) => ({
        deviceName: d.deviceName,
        index,
        boot: d.boot,
        kind: "compute#attachedDisk",
        mode: "READ_WRITE",
        source: d.source,
        type: "PERSISTENT",
      })),
      creationTimestamp: apiInstance.creationTimestamp,
      tags: apiInstance.tags,
      labels: apiInstance.labels,
      metadata: apiInstance.metadata,
      scheduling: apiInstance.scheduling,
      serviceAccounts: apiInstance.serviceAccounts,
    };
  }

  /**
   * Convert API disk response to internal format
   */
  private convertDisk(apiDisk: ApiComputeDisk): Disk {
    return {
      id: apiDisk.id,
      name: apiDisk.name,
      sizeGb: apiDisk.sizeGb,
      zone: apiDisk.zone,
      status: apiDisk.status,
      sourceImage: apiDisk.sourceImage,
      type: apiDisk.type,
      creationTimestamp: apiDisk.creationTimestamp,
      users: apiDisk.users,
      labels: apiDisk.labels,
    };
  }

  /**
   * Get list of compute instances (VMs)
   * @param zone Optional zone filter. If undefined, lists VMs in all zones.
   * @returns Promise with array of compute instances
   */
  async getInstances(zone?: string): Promise<ComputeInstance[]> {
    const cacheKey = zone ? `instances:${zone}` : "instances:all";
    const cachedData = this.vmCache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < this.CACHE_TTL) {
      return cachedData.data;
    }

    try {
      // Return stale cache while refreshing in background
      if (!zone && this.hasCachedZoneInstances()) {
        const combinedInstances = this.getCombinedCachedInstances();
        if (combinedInstances.length > 0) {
          setTimeout(() => this.refreshInstancesInBackground(), 100);
          return combinedInstances;
        }
      }

      // Use REST API instead of gcloud CLI
      const apiInstances = await listComputeInstances(this.gcloudPath, this.projectId, zone);
      const instances = apiInstances.map((i) => this.convertInstance(i));

      this.vmCache.set(cacheKey, { data: instances, timestamp: now });
      return instances;
    } catch (error: unknown) {
      if (cachedData) {
        return cachedData.data;
      }
      return [];
    }
  }

  /**
   * Check if we have any cached zone instances
   */
  private hasCachedZoneInstances(): boolean {
    for (const key of this.vmCache.keys()) {
      if (key.startsWith("instances:") && key !== "instances:all") {
        return true;
      }
    }
    return false;
  }

  /**
   * Combine all cached zone instances
   */
  private getCombinedCachedInstances(): ComputeInstance[] {
    const instances: ComputeInstance[] = [];
    const seenIds = new Set<string>();

    for (const [key, value] of this.vmCache.entries()) {
      if (key.startsWith("instances:") && key !== "instances:all") {
        for (const instance of value.data) {
          if (!seenIds.has(instance.id)) {
            instances.push(instance);
            seenIds.add(instance.id);
          }
        }
      }
    }

    return instances;
  }

  /**
   * Refresh instances in background using REST API
   */
  private async refreshInstancesInBackground(): Promise<void> {
    try {
      const apiInstances = await listComputeInstances(this.gcloudPath, this.projectId);
      const instances = apiInstances.map((i) => this.convertInstance(i));
      this.vmCache.set("instances:all", { data: instances, timestamp: Date.now() });
    } catch (error) {
      // Silently fail for background refresh
    }
  }

  /**
   * Get a specific compute instance by name and zone
   * @param name Instance name
   * @param zone Zone of the instance
   * @returns Promise with instance details or null if not found
   */
  async getInstance(name: string, zone: string): Promise<ComputeInstance | null> {
    // Check if we have this instance in cache first
    const allInstancesKey = "instances:all";
    const zoneInstancesKey = `instances:${zone}`;

    // Check zone-specific cache first
    const zoneCache = this.vmCache.get(zoneInstancesKey);
    if (zoneCache) {
      const instance = zoneCache.data.find((i) => i.name === name);
      if (instance) {
        return instance;
      }
    }

    // Check all-instances cache
    const allCache = this.vmCache.get(allInstancesKey);
    if (allCache) {
      const instance = allCache.data.find((i) => i.name === name && this.formatZone(i.zone) === zone);
      if (instance) {
        return instance;
      }
    }

    // If not found in cache, fetch directly using REST API
    try {
      const apiInstance = await getComputeInstance(this.gcloudPath, this.projectId, zone, name);
      return this.convertInstance(apiInstance);
    } catch (error: unknown) {
      showFailureToast({
        title: "Failed to Fetch Instance",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Get a specific disk by name and zone
   * @param name Disk name
   * @param zone Zone of the disk
   * @returns Promise with disk details or null if not found
   */
  async getDisk(name: string, zone: string): Promise<Disk | null> {
    // Check cache first
    const cacheKey = `disks:${zone}`;
    const cachedData = this.diskCache.get(cacheKey);
    if (cachedData) {
      const disk = cachedData.data.find((d) => d.name === name);
      if (disk) {
        return disk;
      }
    }

    // Fetch all disks in zone and find the one we need
    try {
      const disks = await this.getDisks(zone);
      return disks.find((d) => d.name === name) || null;
    } catch (error: unknown) {
      showFailureToast({
        title: "Failed to Fetch Disk",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * List all zones available in the project
   * @returns Promise with array of zone names
   */
  async listZones(): Promise<string[]> {
    const now = Date.now();
    if (ComputeService.zonesCache && now - ComputeService.zonesCache.timestamp < ComputeService.ZONES_CACHE_TTL) {
      return ComputeService.zonesCache.zones;
    }

    try {
      // Use REST API instead of gcloud CLI
      const apiZones = await listComputeZones(this.gcloudPath, this.projectId);
      const zones = apiZones.map((z) => z.name);
      ComputeService.zonesCache = { zones, timestamp: now };
      return zones;
    } catch (error: unknown) {
      if (ComputeService.zonesCache) {
        return ComputeService.zonesCache.zones;
      }
      return [];
    }
  }

  /**
   * Get list of disks
   * @param zone Optional zone filter. If undefined, lists disks in all zones.
   * @returns Promise with array of disks
   */
  async getDisks(zone?: string): Promise<Disk[]> {
    const cacheKey = zone ? `disks:${zone}` : "disks:all";
    const cachedData = this.diskCache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < this.CACHE_TTL) {
      return cachedData.data;
    }

    try {
      if (!zone && this.hasCachedZoneDisks()) {
        const combinedDisks = this.getCombinedCachedDisks();
        if (combinedDisks.length > 0) {
          setTimeout(() => this.refreshDisksInBackground(), 100);
          return combinedDisks;
        }
      }

      // Use REST API instead of gcloud CLI
      const apiDisks = await listComputeDisks(this.gcloudPath, this.projectId, zone);
      const disks = apiDisks.map((d) => this.convertDisk(d));

      this.diskCache.set(cacheKey, { data: disks, timestamp: now });
      return disks;
    } catch (error: unknown) {
      if (cachedData) {
        return cachedData.data;
      }
      return [];
    }
  }

  /**
   * Check if we have any cached zone disks
   */
  private hasCachedZoneDisks(): boolean {
    for (const key of this.diskCache.keys()) {
      if (key.startsWith("disks:") && key !== "disks:all") {
        return true;
      }
    }
    return false;
  }

  /**
   * Combine all cached zone disks
   */
  private getCombinedCachedDisks(): Disk[] {
    const disks: Disk[] = [];
    const seenIds = new Set<string>();

    for (const [key, value] of this.diskCache.entries()) {
      if (key.startsWith("disks:") && key !== "disks:all") {
        for (const disk of value.data) {
          if (!seenIds.has(disk.id)) {
            disks.push(disk);
            seenIds.add(disk.id);
          }
        }
      }
    }

    return disks;
  }

  /**
   * Refresh disks in background using REST API
   */
  private async refreshDisksInBackground(): Promise<void> {
    try {
      const apiDisks = await listComputeDisks(this.gcloudPath, this.projectId);
      const disks = apiDisks.map((d) => this.convertDisk(d));
      this.diskCache.set("disks:all", { data: disks, timestamp: Date.now() });
    } catch (error) {
      // Silently fail for background refresh
    }
  }

  /**
   * Start a compute instance using REST API
   * @param name Instance name
   * @param zone Zone of the instance
   * @returns Promise indicating success
   */
  async startInstance(name: string, zone: string): Promise<boolean> {
    try {
      await startComputeInstance(this.gcloudPath, this.projectId, zone, name);
      this.clearCache("instances");
      return true;
    } catch (error: unknown) {
      showFailureToast({
        title: "Failed to Start Instance",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  /**
   * Stop a compute instance using REST API
   * @param name Instance name
   * @param zone Zone of the instance
   * @returns Promise indicating success and VM status information
   */
  async stopInstance(name: string, zone: string): Promise<{ success: boolean; isTimedOut?: boolean }> {
    try {
      await stopComputeInstance(this.gcloudPath, this.projectId, zone, name);
      this.clearCache("instances");
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // REST API might return before operation completes
      if (errorMessage.includes("timed out") || errorMessage.includes("RUNNING")) {
        this.clearCache("instances");
        return { success: true, isTimedOut: true };
      }

      showFailureToast({
        title: "Failed to Stop Instance",
        message: errorMessage,
      });
      return { success: false };
    }
  }

  /**
   * Clear cache for a specific resource type
   * @param type The type of resource cache to clear ("instances" or "disks")
   */
  private clearCache(type: "instances" | "disks"): void {
    if (type === "instances") {
      this.vmCache.clear();
    } else {
      this.diskCache.clear();
    }
  }

  /**
   * Format the machine type for display
   * @param machineType Full machine type URL
   * @returns Formatted machine type string
   */
  formatMachineType(machineType: string): string {
    const parts = machineType.split("/");
    return parts[parts.length - 1];
  }

  /**
   * Format the zone for display
   * @param zone Full zone URL
   * @returns Formatted zone string
   */
  formatZone(zone: string): string {
    const parts = zone.split("/");
    return parts[parts.length - 1];
  }

  /**
   * Get the status color based on instance status
   * @param status Instance status
   * @returns CSS color name
   */
  getStatusColor(status: string): string {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "running") return "green";
    if (lowerStatus === "terminated" || lowerStatus === "stopped") return "red";
    if (lowerStatus === "stopping" || lowerStatus === "starting") return "orange";
    return "gray";
  }
}
