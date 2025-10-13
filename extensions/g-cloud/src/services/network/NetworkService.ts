import { executeGcloudCommand } from "../../gcloud";
import { getAllRegions } from "../../utils/regions";

const CACHE_TTL = {
  SHORT: 60000,
  MEDIUM: 300000,
  LONG: 3600000,
  VERY_LONG: 86400000,
};

const EXECUTION_DEFAULTS = {
  TIMEOUT: {
    LIST: 30000,
    CREATE: 60000,
    DELETE: 45000,
  },
};

export class NetworkServiceError extends Error {
  constructor(
    message: string,
    public readonly context: Record<string, unknown>,
  ) {
    super(message);
    this.name = "NetworkServiceError";
  }
}

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
  addressType: string;
  purpose?: string;
  network?: string;
  subnetwork?: string;
  region?: string;
  status: string;
  users?: string[];
  creationTimestamp: string;
}

export interface FirewallRule {
  id: string;
  name: string;
  description?: string;
  network: string;
  priority: number;
  direction: string;
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

export class NetworkService {
  private gcloudPath: string;
  private projectId: string;
  private vpcCache: Map<string, { data: VPC[]; timestamp: number }> = new Map();
  private subnetCache: Map<string, { data: Subnet[]; timestamp: number }> = new Map();
  private ipCache: Map<string, { data: IPAddress[]; timestamp: number }> = new Map();
  private firewallCache: Map<string, { data: FirewallRule[]; timestamp: number }> = new Map();

  private static regionsCache: string[] | null = null;

  private static instance: NetworkService | null = null;

  public static getInstance(gcloudPath: string, projectId: string): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService(gcloudPath, projectId);
    } else {
      NetworkService.instance.gcloudPath = gcloudPath;
      NetworkService.instance.projectId = projectId;
    }
    return NetworkService.instance;
  }

  constructor(gcloudPath: string, projectId: string) {
    this.gcloudPath = gcloudPath;
    this.projectId = projectId;
  }

  private handleError(error: unknown, context: Record<string, unknown>): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Network Service Error:", {
      message: errorMessage,
      ...context,
    });
    throw new NetworkServiceError(errorMessage, context);
  }

  async getVPCs(): Promise<VPC[]> {
    const cacheKey = "vpcs";
    const cachedData = this.vpcCache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < CACHE_TTL.MEDIUM) {
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

      this.vpcCache.set(cacheKey, { data: vpcs, timestamp: now });

      return vpcs;
    } catch (error: unknown) {
      console.error("Error fetching VPC networks:", error);

      if (cachedData) {
        return cachedData.data;
      }

      return [];
    }
  }

  async getVPC(name: string): Promise<VPC | null> {
    try {
      const cachedVPCs = this.vpcCache.get("vpcs");
      if (cachedVPCs) {
        const cachedVPC = cachedVPCs.data.find((vpc) => vpc.name === name);
        if (cachedVPC) return cachedVPC;
      }

      const command = ["compute", "networks", "describe", name, `--project=${this.projectId}`, "--format=json"];

      const result = await executeGcloudCommand(this.gcloudPath, command.join(" "), undefined, { skipCache: true });

      if (!result || typeof result !== "object") {
        return null;
      }

      return result as VPC;
    } catch (error: unknown) {
      console.error(`Error fetching VPC ${name}:`, error);
      return null;
    }
  }

  async createVPC(
    name: string,
    description?: string,
    subnetMode: "auto" | "custom" = "auto",
    mtu?: number,
  ): Promise<boolean> {
    try {
      let command = `compute networks create ${name}`;

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

      await executeGcloudCommand(this.gcloudPath, command, this.projectId);

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

  async getSubnets(region?: string): Promise<Subnet[]> {
    const cacheKey = region ? `subnets:${region}` : "subnets:all";
    const cachedData = this.subnetCache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < CACHE_TTL.SHORT) {
      return cachedData.data;
    }

    try {
      const command = ["compute", "networks", "subnets", "list"];

      if (region) {
        command.push(`--regions=${region}`);
      }

      command.push(`--project=${this.projectId}`);
      command.push("--format=json");

      const result = await executeGcloudCommand(this.gcloudPath, command.join(" "), undefined, {
        timeout: EXECUTION_DEFAULTS.TIMEOUT.LIST,
      });

      if (!Array.isArray(result)) {
        throw new Error("Invalid response format from gcloud command");
      }

      const subnets = result as Subnet[];

      this.subnetCache.set(cacheKey, { data: subnets, timestamp: now });

      return subnets;
    } catch (error: unknown) {
      console.error("Error fetching subnets:", error);

      if (cachedData) {
        return cachedData.data;
      }

      return [];
    }
  }

  async getIPs(region?: string): Promise<IPAddress[]> {
    const cacheKey = region ? `ips:${region}` : "ips:all";
    const cachedData = this.ipCache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < CACHE_TTL.MEDIUM) {
      return cachedData.data;
    }

    try {
      const command = ["compute", "addresses", "list"];

      if (region) {
        command.push(`--regions=${region}`);
      }

      command.push(`--project=${this.projectId}`);
      command.push("--format=json");

      const result = await executeGcloudCommand(this.gcloudPath, command.join(" "), undefined, {
        timeout: EXECUTION_DEFAULTS.TIMEOUT.LIST,
      });

      if (!Array.isArray(result)) {
        throw new Error("Invalid response format from gcloud command");
      }

      const ips = result as IPAddress[];

      this.ipCache.set(cacheKey, { data: ips, timestamp: now });

      return ips;
    } catch (error: unknown) {
      console.error("Error fetching IP addresses:", error);

      if (cachedData) {
        return cachedData.data;
      }

      return [];
    }
  }

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
      let command = `compute addresses create ${name}`;

      command += ` --region=${region}`;

      if (addressType === "INTERNAL") {
        command += " --subnet";

        if (addressOptions.subnet) {
          command += `=${addressOptions.subnet}`;
        } else {
          throw new Error("Subnet is required for internal IP addresses");
        }
      }

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

      await executeGcloudCommand(this.gcloudPath, command, this.projectId);

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

  async getFirewallRules(): Promise<FirewallRule[]> {
    const cacheKey = "firewalls";
    const cachedData = this.firewallCache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < CACHE_TTL.MEDIUM) {
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

      this.firewallCache.set(cacheKey, { data: rules, timestamp: now });

      return rules;
    } catch (error: unknown) {
      console.error("Error fetching firewall rules:", error);

      if (cachedData) {
        return cachedData.data;
      }

      return [];
    }
  }

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
      const command = ["compute", "firewall-rules", "create", name];

      command.push(`--network=${network}`);

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

      command.push(`--project=${this.projectId}`);
      command.push("--format=json");

      await executeGcloudCommand(this.gcloudPath, command.join(" "), undefined, { skipCache: true });

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

  async listRegions(): Promise<string[]> {
    return getAllRegions();
  }

  async getRegions(): Promise<string[]> {
    return this.listRegions();
  }

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
      const command = ["compute", "networks", "subnets", "create", name];

      command.push(`--network=${network}`);
      command.push(`--region=${region}`);
      command.push(`--range=${ipRange}`);

      if (privateGoogleAccess) {
        command.push("--enable-private-ip-google-access");
      }

      if (enableFlowLogs) {
        command.push("--enable-flow-logs");
      }

      if (secondaryRanges && secondaryRanges.length > 0) {
        for (const range of secondaryRanges) {
          command.push(`--secondary-range=${range.rangeName}=${range.ipCidrRange}`);
        }
      }

      command.push(`--project=${this.projectId}`);
      command.push("--format=json");

      await executeGcloudCommand(this.gcloudPath, command.join(" "), undefined, {
        skipCache: true,
        timeout: EXECUTION_DEFAULTS.TIMEOUT.CREATE,
      });

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

  async forceRefreshSubnets(): Promise<void> {
    this.clearSubnetCache();

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

      this.subnetCache.set("subnets:all", { data: subnets, timestamp: Date.now() });
    } catch (error: unknown) {
      console.error("Error during forced subnet refresh:", error);
    }
  }

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

  async generateAvailableIPSuggestions(
    addressType: "INTERNAL" | "EXTERNAL" = "EXTERNAL",
    subnet?: string,
  ): Promise<string[]> {
    try {
      if (addressType === "EXTERNAL") {
        return [
          "34.120." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
          "35.186." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
          "104.196." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
          "130.211." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
        ];
      }

      if (subnet) {
        try {
          const subnets = await this.getSubnets();
          const targetSubnet = subnets.find((s) => s.name === subnet);

          if (targetSubnet) {
            const cidrParts = targetSubnet.ipCidrRange.split("/");
            const baseIP = cidrParts[0];
            const baseOctets = baseIP.split(".");

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

  formatRegion(region: string): string {
    const parts = region.split("/");
    return parts[parts.length - 1];
  }

  formatNetwork(network: string): string {
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

  private validateIPAddress(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(ip)) return false;

    const parts = ip.split(".").map(Number);
    return parts.every((part) => part >= 0 && part <= 255);
  }

  private validateCIDR(cidr: string): boolean {
    const [ip, prefix] = cidr.split("/");
    if (!this.validateIPAddress(ip)) return false;

    const prefixNum = Number(prefix);
    return !isNaN(prefixNum) && prefixNum >= 0 && prefixNum <= 32;
  }
}
