/**
 * Network Service - Provides efficient access to Google Cloud VPC, IP, and Firewall functionality
 * Optimized for performance and user experience
 */

import { executeGcloudCommand } from "../../gcloud";
import { getAllRegions } from "../../utils/regions";

// Performance optimizations
const CACHE_TTL = {
  SHORT: 60000, // 1 minute
  MEDIUM: 300000, // 5 minutes
  LONG: 3600000, // 1 hour
  VERY_LONG: 86400000, // 24 hours
};

// Command execution optimizations
const EXECUTION_DEFAULTS = {
  TIMEOUT: {
    LIST: 30000, // 30 seconds for list operations
    CREATE: 60000, // 60 seconds for create operations
    DELETE: 45000, // 45 seconds for delete operations
  },
};

// Error types for better error handling
export class NetworkServiceError extends Error {
  constructor(
    message: string,
    public readonly context: Record<string, unknown>,
  ) {
    super(message);
    this.name = "NetworkServiceError";
  }
}

// Interfaces
export interface VPC {
  id: string;
  name: string;
  description?: string;
  autoCreateSubnetworks: boolean;
  subnetworkRange?: string;
  creationTimestamp: string;
  routingConfig?: {
    routingMode: string;
  };
  mtu?: number;
  gatewayIPv4?: string;
}

export interface Subnet {
  id: string;
  name: string;
  network: string;
  region: string;
  ipCidrRange: string;
  privateIpGoogleAccess: boolean;
  enableFlowLogs?: boolean;
  gatewayAddress?: string;
  secondaryIpRanges?: {
    rangeName: string;
    ipCidrRange: string;
  }[];
  creationTimestamp: string;
}

export interface IPAddress {
  id: string;
  name: string;
  description?: string;
  address: string;
  addressType: string; // "INTERNAL" or "EXTERNAL"
  purpose?: string;
  network?: string;
  subnetwork?: string;
  region?: string;
  status: string; // "RESERVED" or "IN_USE"
  users?: string[];
  creationTimestamp: string;
}

export interface FirewallRule {
  id: string;
  name: string;
  description?: string;
  network: string;
  priority: number;
  direction: string; // "INGRESS" or "EGRESS"
  sourceRanges?: string[];
  destinationRanges?: string[];
  sourceTags?: string[];
  targetTags?: string[];
  sourceServiceAccounts?: string[];
  targetServiceAccounts?: string[];
  disabled: boolean;
  allowed?: {
    IPProtocol: string;
    ports?: string[];
  }[];
  denied?: {
    IPProtocol: string;
    ports?: string[];
  }[];
  creationTimestamp: string;
  logConfig?: {
    enable: boolean;
  };
}

/**
 * Network Service class - provides optimized access to VPC, IP, and Firewall functionality
 */
export class NetworkService {
  private gcloudPath: string;
  private projectId: string;
  private vpcCache: Map<string, { data: VPC[]; timestamp: number }> = new Map();
  private subnetCache: Map<string, { data: Subnet[]; timestamp: number }> = new Map();
  private ipCache: Map<string, { data: IPAddress[]; timestamp: number }> = new Map();
  private firewallCache: Map<string, { data: FirewallRule[]; timestamp: number }> = new Map();

  // Static cache for frequently accessed data
  private static regionsCache: string[] | null = null;

  // Singleton instance for better memory management
  private static instance: NetworkService | null = null;

  /**
   * Get singleton instance
   */
  public static getInstance(gcloudPath: string, projectId: string): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService(gcloudPath, projectId);
    } else {
      // Update path and project if they changed
      NetworkService.instance.gcloudPath = gcloudPath;
      NetworkService.instance.projectId = projectId;
    }
    return NetworkService.instance;
  }

  constructor(gcloudPath: string, projectId: string) {
    this.gcloudPath = gcloudPath;
    this.projectId = projectId;
  }

  /**
   * Helper method to handle errors consistently
   */
  private handleError(error: unknown, context: Record<string, unknown>): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Network Service Error:", {
      message: errorMessage,
      ...context,
    });
    throw new NetworkServiceError(errorMessage, context);
  }

  /**
   * Get list of VPC networks
   * @returns Promise with array of VPC networks
   */
  async getVPCs(): Promise<VPC[]> {
    const cacheKey = "vpcs";
    const cachedData = this.vpcCache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < CACHE_TTL.MEDIUM) {
      // console.log(`Using cached VPC data`);
      return cachedData.data;
    }

    try {
      const command = ["compute", "networks", "list", `--project=${this.projectId}`, "--format=json"];

      const result = await executeGcloudCommand(this.gcloudPath, command.join(" "), undefined, {
        timeout: EXECUTION_DEFAULTS.TIMEOUT.LIST,
      });

      if (!Array.isArray(result)) {
        throw new Error("Invalid response format from gcloud command");
      }

      const vpcs = result as VPC[];

      // Cache the result
      this.vpcCache.set(cacheKey, { data: vpcs, timestamp: now });

      return vpcs;
    } catch (error: unknown) {
      console.error("Error fetching VPC networks:", error);

      // If we have cached data, return it even if expired
      if (cachedData) {
        // console.log("Returning expired cached data as fallback");
        return cachedData.data;
      }

      // Return empty array instead of throwing to prevent UI from breaking
      return [];
    }
  }

  /**
   * Get a specific VPC network by name
   * @param name Name of the VPC to retrieve
   * @returns Promise with VPC if found, null otherwise
   */
  async getVPC(name: string): Promise<VPC | null> {
    try {
      // First try to find in cache
      const cachedVPCs = this.vpcCache.get("vpcs");
      if (cachedVPCs) {
        const cachedVPC = cachedVPCs.data.find((vpc) => vpc.name === name);
        if (cachedVPC) return cachedVPC;
      }

      // If not found in cache or cache is expired, fetch directly
      const command = ["compute", "networks", "describe", name, `--project=${this.projectId}`, "--format=json"];

      const result = await executeGcloudCommand(this.gcloudPath, command.join(" "), undefined, { skipCache: true });

      // The describe command returns a single object, not an array
      if (!result || typeof result !== "object") {
        return null;
      }

      return result as VPC;
    } catch (error: unknown) {
      console.error(`Error fetching VPC ${name}:`, error);
      return null;
    }
  }

  /**
   * Create a VPC network
   * @param name VPC name
   * @param description Optional description
   * @param subnetMode "auto" or "custom" subnet mode
   * @param mtu Optional MTU setting
   * @returns Promise resolving to true if successful
   */
  async createVPC(
    name: string,
    description?: string,
    subnetMode: "auto" | "custom" = "auto",
    mtu?: number,
  ): Promise<boolean> {
    try {
      // Build the command
      let command = `compute networks create ${name}`;

      // Add options
      if (subnetMode === "auto") {
        command += " --subnet-mode=auto";
      } else {
        command += " --subnet-mode=custom";
      }

      if (description) {
        command += ` --description="${description}"`;
      }

      if (mtu) {
        command += ` --mtu=${mtu}`;
      }

      // Execute the command
      await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      // Clear cache to ensure fresh data
      this.clearVPCCache();

      return true;
    } catch (error) {
      this.handleError(error, {
        operation: "Create VPC",
        vpcName: name,
        subnetMode,
        mtu,
        projectId: this.projectId,
      });
      return false;
    }
  }

  /**
   * Get list of subnets, optionally filtered by region
   * @param region Optional region filter
   * @returns Promise with array of subnets
   */
  async getSubnets(region?: string): Promise<Subnet[]> {
    const cacheKey = region ? `subnets:${region}` : "subnets:all";
    const cachedData = this.subnetCache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < CACHE_TTL.SHORT) {
      // console.log(`Using cached subnet data for ${cacheKey}`);
      return cachedData.data;
    }

    try {
      // Build command
      const command = ["compute", "networks", "subnets", "list"];

      // Add region filter if specified
      if (region) {
        command.push(`--regions=${region}`);
      }

      // Add project and format
      command.push(`--project=${this.projectId}`);
      command.push("--format=json");

      const result = await executeGcloudCommand(this.gcloudPath, command.join(" "), undefined, {
        timeout: EXECUTION_DEFAULTS.TIMEOUT.LIST,
      });

      if (!Array.isArray(result)) {
        throw new Error("Invalid response format from gcloud command");
      }

      const subnets = result as Subnet[];

      // Cache the result
      this.subnetCache.set(cacheKey, { data: subnets, timestamp: now });

      return subnets;
    } catch (error: unknown) {
      console.error("Error fetching subnets:", error);

      // If we have cached data, return it even if expired
      if (cachedData) {
        // console.log("Returning expired cached data as fallback");
        return cachedData.data;
      }

      // Return empty array
      return [];
    }
  }

  /**
   * Get list of IP addresses, optionally filtered by region
   * @param region Optional region filter
   * @returns Promise with array of IP addresses
   */
  async getIPs(region?: string): Promise<IPAddress[]> {
    const cacheKey = region ? `ips:${region}` : "ips:all";
    const cachedData = this.ipCache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < CACHE_TTL.MEDIUM) {
      // console.log(`Using cached IP data for ${cacheKey}`);
      return cachedData.data;
    }

    try {
      // Build command
      const command = ["compute", "addresses", "list"];

      // Add region filter if specified
      if (region) {
        command.push(`--regions=${region}`);
      }

      // Add project and format
      command.push(`--project=${this.projectId}`);
      command.push("--format=json");

      const result = await executeGcloudCommand(this.gcloudPath, command.join(" "), undefined, {
        timeout: EXECUTION_DEFAULTS.TIMEOUT.LIST,
      });

      if (!Array.isArray(result)) {
        throw new Error("Invalid response format from gcloud command");
      }

      const ips = result as IPAddress[];

      // Cache the result
      this.ipCache.set(cacheKey, { data: ips, timestamp: now });

      return ips;
    } catch (error: unknown) {
      console.error("Error fetching IP addresses:", error);

      // If we have cached data, return it even if expired
      if (cachedData) {
        // console.log("Returning expired cached data as fallback");
        return cachedData.data;
      }

      // Return empty array
      return [];
    }
  }

  /**
   * Create a new IP address
   * @param name IP address name
   * @param region Region to create the IP in
   * @param addressType Type of address (INTERNAL or EXTERNAL)
   * @param addressOptions Additional configuration options
   * @returns Promise resolving to true if successful
   */
  async createIP(
    name: string,
    region: string,
    addressType: "INTERNAL" | "EXTERNAL" = "EXTERNAL",
    addressOptions: {
      description?: string;
      subnet?: string;
      address?: string;
      purpose?: string;
      network?: string;
      ephemeral?: boolean;
      networkTier?: "PREMIUM" | "STANDARD";
    } = {},
  ): Promise<boolean> {
    try {
      // Build basic command
      let command = `compute addresses create ${name}`;

      // Add required parameters
      command += ` --region=${region}`;

      // Set address type
      if (addressType === "INTERNAL") {
        command += " --subnet";

        // Internal addresses require a subnet
        if (addressOptions.subnet) {
          command += `=${addressOptions.subnet}`;
        } else {
          throw new Error("Subnet is required for internal IP addresses");
        }
      }

      // Add optional parameters
      if (addressOptions.description) {
        command += ` --description="${addressOptions.description}"`;
      }

      if (addressOptions.address) {
        command += ` --addresses=${addressOptions.address}`;
      }

      if (addressOptions.purpose) {
        command += ` --purpose=${addressOptions.purpose}`;
      }

      if (addressOptions.network) {
        command += ` --network=${addressOptions.network}`;
      }

      if (addressOptions.networkTier) {
        command += ` --network-tier=${addressOptions.networkTier}`;
      }

      // Execute command
      await executeGcloudCommand(this.gcloudPath, command, this.projectId);

      // Clear IP cache
      this.clearIPCache();

      return true;
    } catch (error) {
      this.handleError(error, {
        operation: "Create IP Address",
        ipName: name,
        region,
        addressType,
        options: addressOptions,
        projectId: this.projectId,
      });
      return false;
    }
  }

  /**
   * Get list of firewall rules
   * @returns Promise with array of firewall rules
   */
  async getFirewallRules(): Promise<FirewallRule[]> {
    const cacheKey = "firewalls";
    const cachedData = this.firewallCache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < CACHE_TTL.MEDIUM) {
      // console.log(`Using cached firewall data`);
      return cachedData.data;
    }

    try {
      const command = ["compute", "firewall-rules", "list", `--project=${this.projectId}`, "--format=json"];

      const result = await executeGcloudCommand(this.gcloudPath, command.join(" "), undefined, {
        timeout: EXECUTION_DEFAULTS.TIMEOUT.LIST,
      });

      if (!Array.isArray(result)) {
        throw new Error("Invalid response format from gcloud command");
      }

      const rules = result as FirewallRule[];

      // Cache the result
      this.firewallCache.set(cacheKey, { data: rules, timestamp: now });

      return rules;
    } catch (error: unknown) {
      console.error("Error fetching firewall rules:", error);

      // If we have cached data, return it even if expired
      if (cachedData) {
        // console.log("Returning expired cached data as fallback");
        return cachedData.data;
      }

      // Return empty array
      return [];
    }
  }

  /**
   * Create a new firewall rule
   * @param name Name of the new firewall rule
   * @param network Name of the network for the rule
   * @param ruleOptions Firewall rule configuration
   * @returns Promise with success or failure
   */
  async createFirewallRule(
    name: string,
    network: string,
    ruleOptions: {
      description?: string;
      direction?: "INGRESS" | "EGRESS";
      priority?: number;
      sourceRanges?: string[];
      destinationRanges?: string[];
      sourceTags?: string[];
      targetTags?: string[];
      sourceServiceAccounts?: string[];
      targetServiceAccounts?: string[];
      allowed?: {
        protocol: string;
        ports?: string[];
      }[];
      denied?: {
        protocol: string;
        ports?: string[];
      }[];
      disabled?: boolean;
      enableLogging?: boolean;
    },
  ): Promise<boolean> {
    try {
      // Build command
      const command = ["compute", "firewall-rules", "create", name];

      // Add required parameters
      command.push(`--network=${network}`);

      // Add optional parameters
      if (ruleOptions.description) {
        command.push(`--description="${ruleOptions.description}"`);
      }

      if (ruleOptions.direction) {
        command.push(`--direction=${ruleOptions.direction}`);
      }

      if (ruleOptions.priority) {
        command.push(`--priority=${ruleOptions.priority}`);
      }

      if (ruleOptions.sourceRanges) {
        command.push(`--source-ranges=${ruleOptions.sourceRanges.join(",")}`);
      }

      if (ruleOptions.destinationRanges) {
        command.push(`--destination-ranges=${ruleOptions.destinationRanges.join(",")}`);
      }

      if (ruleOptions.sourceTags) {
        command.push(`--source-tags=${ruleOptions.sourceTags.join(",")}`);
      }

      if (ruleOptions.targetTags) {
        command.push(`--target-tags=${ruleOptions.targetTags.join(",")}`);
      }

      if (ruleOptions.allowed) {
        for (const allowed of ruleOptions.allowed) {
          if (allowed.ports && allowed.ports.length > 0) {
            command.push(`--allow=${allowed.protocol}:${allowed.ports.join(",")}`);
          } else {
            command.push(`--allow=${allowed.protocol}`);
          }
        }
      }

      if (ruleOptions.denied) {
        for (const denied of ruleOptions.denied) {
          if (denied.ports && denied.ports.length > 0) {
            command.push(`--deny=${denied.protocol}:${denied.ports.join(",")}`);
          } else {
            command.push(`--deny=${denied.protocol}`);
          }
        }
      }

      if (ruleOptions.disabled) {
        command.push("--disabled");
      }

      if (ruleOptions.enableLogging) {
        command.push("--enable-logging");
      }

      // Add project and format
      command.push(`--project=${this.projectId}`);
      command.push("--format=json");

      await executeGcloudCommand(this.gcloudPath, command.join(" "), undefined, { skipCache: true });

      // Clear the firewall cache
      this.firewallCache.delete("firewalls");

      return true;
    } catch (error) {
      this.handleError(error, {
        operation: "Create Firewall Rule",
        ruleName: name,
        network,
        options: ruleOptions,
        projectId: this.projectId,
      });
      return false;
    }
  }

  /**
   * Get list of regions
   * @returns Promise with array of region names
   */
  async listRegions(): Promise<string[]> {
    // Use static regions list from regions.ts
    return getAllRegions();
  }

  /**
   * Alias for listRegions
   * @returns Promise with array of region names
   */
  async getRegions(): Promise<string[]> {
    return this.listRegions();
  }

  /**
   * Create a new subnet
   * @param name Name of the new subnet
   * @param network Name of the network for the subnet
   * @param region Region to create the subnet in
   * @param ipRange Primary IP range (CIDR format)
   * @param privateGoogleAccess Whether to enable private Google access
   * @param enableFlowLogs Whether to enable flow logs
   * @param secondaryRanges Optional secondary IP ranges
   * @returns Promise with success or failure
   */
  async createSubnet(
    name: string,
    network: string,
    region: string,
    ipRange: string,
    privateGoogleAccess: boolean = false,
    enableFlowLogs: boolean = false,
    secondaryRanges?: { rangeName: string; ipCidrRange: string }[],
  ): Promise<boolean> {
    try {
      // Build command
      const command = ["compute", "networks", "subnets", "create", name];

      // Add required parameters
      command.push(`--network=${network}`);
      command.push(`--region=${region}`);
      command.push(`--range=${ipRange}`);

      // Add optional parameters
      if (privateGoogleAccess) {
        command.push("--enable-private-ip-google-access");
      }

      if (enableFlowLogs) {
        command.push("--enable-flow-logs");
      }

      // Add secondary ranges if provided
      if (secondaryRanges && secondaryRanges.length > 0) {
        for (const range of secondaryRanges) {
          command.push(`--secondary-range=${range.rangeName}=${range.ipCidrRange}`);
        }
      }

      // Add project and format
      command.push(`--project=${this.projectId}`);
      command.push("--format=json");

      await executeGcloudCommand(this.gcloudPath, command.join(" "), undefined, {
        skipCache: true,
        timeout: EXECUTION_DEFAULTS.TIMEOUT.CREATE,
      });

      // Clear the subnet cache immediately
      this.clearSubnetCache();

      return true;
    } catch (error) {
      this.handleError(error, {
        operation: "Create Subnet",
        subnetName: name,
        network,
        region,
        ipRange,
        options: {
          privateGoogleAccess,
          enableFlowLogs,
          secondaryRanges,
        },
        projectId: this.projectId,
      });
      return false;
    }
  }

  /**
   * Force refresh of subnets
   * @returns Promise with refreshed subnet data
   */
  async forceRefreshSubnets(): Promise<void> {
    // Clear subnet cache
    this.clearSubnetCache();

    // Optionally prefetch data
    try {
      const command = ["compute", "networks", "subnets", "list", `--project=${this.projectId}`, "--format=json"];

      const result = await executeGcloudCommand(this.gcloudPath, command.join(" "), undefined, {
        skipCache: true,
        timeout: EXECUTION_DEFAULTS.TIMEOUT.LIST,
      });

      if (!Array.isArray(result)) {
        throw new Error("Invalid response format from gcloud command");
      }

      const subnets = result as Subnet[];

      // Cache the result
      this.subnetCache.set("subnets:all", { data: subnets, timestamp: Date.now() });
    } catch (error: unknown) {
      console.error("Error during forced subnet refresh:", error);
    }
  }

  /**
   * Clear various caches
   */
  private clearVPCCache(): void {
    this.vpcCache.clear();
  }

  private clearSubnetCache(): void {
    this.subnetCache.clear();
  }

  private clearIPCache(): void {
    this.ipCache.clear();
  }

  private clearFirewallCache(): void {
    this.firewallCache.clear();
  }

  /**
   * Generate four available IP address suggestions
   * @param addressType "INTERNAL" or "EXTERNAL"
   * @param subnet Optional subnet for internal IPs
   * @returns Promise with array of available IP address suggestions
   */
  async generateAvailableIPSuggestions(
    addressType: "INTERNAL" | "EXTERNAL" = "EXTERNAL",
    subnet?: string,
  ): Promise<string[]> {
    try {
      // For EXTERNAL addresses, suggest standard IP formats
      if (addressType === "EXTERNAL") {
        return [
          "34.120." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
          "35.186." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
          "104.196." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
          "130.211." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
        ];
      }

      // For INTERNAL addresses, use subnet CIDR if available
      if (subnet) {
        try {
          const subnets = await this.getSubnets();
          const targetSubnet = subnets.find((s) => s.name === subnet);

          if (targetSubnet) {
            // Parse CIDR range (e.g., "10.0.0.0/24")
            const cidrParts = targetSubnet.ipCidrRange.split("/");
            const baseIP = cidrParts[0];
            const baseOctets = baseIP.split(".");

            // Generate 4 IPs in the subnet range
            return [
              `${baseOctets[0]}.${baseOctets[1]}.${baseOctets[2]}.${10 + Math.floor(Math.random() * 240)}`,
              `${baseOctets[0]}.${baseOctets[1]}.${baseOctets[2]}.${50 + Math.floor(Math.random() * 200)}`,
              `${baseOctets[0]}.${baseOctets[1]}.${baseOctets[2]}.${100 + Math.floor(Math.random() * 150)}`,
              `${baseOctets[0]}.${baseOctets[1]}.${baseOctets[2]}.${200 + Math.floor(Math.random() * 50)}`,
            ];
          }
        } catch (error) {
          console.error("Error parsing subnet range:", error);
        }
      }

      // Default internal IPs if subnet info not available
      return [
        "10.128." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
        "10.129." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
        "172.16." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
        "192.168." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
      ];
    } catch (error) {
      console.error("Error generating IP suggestions:", error);
      return ["10.0.0.10", "10.0.0.20", "10.0.0.30", "10.0.0.40"];
    }
  }

  public clearAllCaches(): void {
    this.clearVPCCache();
    this.clearSubnetCache();
    this.clearIPCache();
    this.clearFirewallCache();
  }

  /**
   * Format helper methods
   */
  formatRegion(region: string): string {
    // Extract region name from full path
    const parts = region.split("/");
    return parts[parts.length - 1];
  }

  formatNetwork(network: string): string {
    // Extract network name from full path
    const parts = network.split("/");
    return parts[parts.length - 1];
  }

  getAddressStatusColor(status: string): string {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "reserved") return "green";
    if (lowerStatus === "in_use") return "blue";
    return "primaryText";
  }

  getFirewallStatusColor(disabled: boolean): string {
    return disabled ? "red" : "green";
  }

  /**
   * Helper method to validate IP address format
   */
  private validateIPAddress(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(ip)) return false;

    const parts = ip.split(".").map(Number);
    return parts.every((part) => part >= 0 && part <= 255);
  }

  /**
   * Helper method to validate CIDR format
   */
  private validateCIDR(cidr: string): boolean {
    const [ip, prefix] = cidr.split("/");
    if (!this.validateIPAddress(ip)) return false;

    const prefixNum = Number(prefix);
    return !isNaN(prefixNum) && prefixNum >= 0 && prefixNum <= 32;
  }
}
