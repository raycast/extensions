/**
 * Compute Service - Provides efficient access to Google Cloud Compute Engine functionality
 * Optimized for performance and user experience
 */

import { executeGcloudCommand } from "../../gcloud";
import { showFailureToast } from "@raycast/utils";

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
 */
export class ComputeService {
  private gcloudPath: string;
  private projectId: string;
  private vmCache: Map<string, { data: ComputeInstance[]; timestamp: number }> = new Map();
  private diskCache: Map<string, { data: Disk[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes cache TTL (increased from 1 minute)

  // Static cache shared between instances for improved performance
  private static zonesCache: { zones: string[]; timestamp: number } | null = null;
  private static readonly ZONES_CACHE_TTL = 3600000; // 1 hour for zones cache

  constructor(gcloudPath: string, projectId: string) {
    this.gcloudPath = gcloudPath;
    this.projectId = projectId;
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
      if (!zone && this.hasCachedZoneInstances()) {
        const combinedInstances = this.getCombinedCachedInstances();
        if (combinedInstances.length > 0) {
          setTimeout(() => this.refreshInstancesInBackground(), 100);
          return combinedInstances;
        }
      }

      const command = zone ? `compute instances list --zone=${zone}` : `compute instances list`;

      const result = await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      if (!result) {
        const emptyInstances: ComputeInstance[] = [];
        this.vmCache.set(cacheKey, { data: emptyInstances, timestamp: now });
        return emptyInstances;
      }

      const instances = Array.isArray(result) ? result : [result];
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
        // Add instances that aren't already in the list
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
   * Refresh instances in background
   */
  private async refreshInstancesInBackground(): Promise<void> {
    try {
      const command = `compute instances list`;
      const result = await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      if (!result) {
        this.vmCache.set("instances:all", { data: [], timestamp: Date.now() });
        return;
      }

      const instances = Array.isArray(result) ? result : [result];
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

    // If not found in cache, fetch directly
    try {
      const command = `compute instances describe ${name} --zone=${zone}`;
      const result = await executeGcloudCommand(this.gcloudPath, command, this.projectId);
      return result ? (result as ComputeInstance) : null;
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
    try {
      const command = `compute disks describe ${name} --zone=${zone} --format=json`;
      const result = await executeGcloudCommand(this.gcloudPath, command, this.projectId);
      return result ? (result as Disk) : null;
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
      const command = `compute zones list`;
      const result = await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      if (!result) {
        return [];
      }

      const zones = Array.isArray(result) ? result.map((zone) => zone.name) : [];
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

      const command = zone ? `compute disks list --zone=${zone}` : `compute disks list`;

      const result = await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      if (!result) {
        const emptyDisks: Disk[] = [];
        this.diskCache.set(cacheKey, { data: emptyDisks, timestamp: now });
        return emptyDisks;
      }

      const disks = Array.isArray(result) ? result : [result];
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
        // Add disks that aren't already in the list
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
   * Refresh disks in background
   */
  private async refreshDisksInBackground(): Promise<void> {
    try {
      const command = `compute disks list`;
      const result = await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      if (!result) {
        this.diskCache.set("disks:all", { data: [], timestamp: Date.now() });
        return;
      }

      const disks = Array.isArray(result) ? result : [result];
      this.diskCache.set("disks:all", { data: disks, timestamp: Date.now() });
    } catch (error) {
      // Silently fail for background refresh
    }
  }

  /**
   * Start a compute instance
   * @param name Instance name
   * @param zone Zone of the instance
   * @returns Promise indicating success
   */
  async startInstance(name: string, zone: string): Promise<boolean> {
    try {
      const command = `compute instances start ${name} --zone=${zone}`;
      await executeGcloudCommand(this.gcloudPath, command, this.projectId);
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
   * Stop a compute instance
   * @param name Instance name
   * @param zone Zone of the instance
   * @returns Promise indicating success and VM status information
   */
  async stopInstance(name: string, zone: string): Promise<{ success: boolean; isTimedOut?: boolean }> {
    try {
      const command = `compute instances stop ${name} --zone=${zone}`;
      await executeGcloudCommand(this.gcloudPath, command, this.projectId);
      this.clearCache("instances");
      return { success: true };
    } catch (error: unknown) {
      // Check if this is a timeout error during VM stopping
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("timed out") && errorMessage.includes("stop")) {
        // VMs can take a while to stop, and we might timeout but the operation continues
        // This is expected behavior for some instances, so mark as "stopping"
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
