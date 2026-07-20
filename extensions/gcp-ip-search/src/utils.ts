import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface SearchResult {
  projectId: string;
  projectName?: string;
  resourceType: "forwarding-rules" | "addresses" | "instances" | "routers";
  name: string;
  region?: string;
  zone?: string;
  ipAddress: string;
  status?: string;
  internalIP?: string;
  externalIP?: string;
  // New detailed fields
  addressType?: string;
  ipVersion?: string;
  users?: string[];
  networkTier?: string;
  labels?: Record<string, string>;
  subnetwork?: string;
  description?: string;
  creationTimestamp?: string;
  isStatic?: boolean;
}

export type GcloudStatusType =
  | { type: "success"; message: string; account?: string }
  | { type: "loading"; message: string }
  | {
      type: "error";
      message: string;
      errorType: "missing_cli" | "login_failed" | "unknown";
    };

/**
 * Common gcloud installation paths
 */
const GCLOUD_PATHS = [
  "/opt/homebrew/share/google-cloud-sdk/bin/gcloud", // Homebrew Apple Silicon
  "/usr/local/share/google-cloud-sdk/bin/gcloud", // Homebrew Intel
  "/usr/local/bin/gcloud", // Common symlink
  "/opt/homebrew/bin/gcloud", // Homebrew bin
  "/usr/local/homebrew/bin/gcloud", // Custom Intel Homebrew
  `${process.env.HOME}/google-cloud-sdk/bin/gcloud`, // Manual install
];

let GCLOUD_PATH: string | null = null;

/**
 * Find gcloud installation path
 */
async function findGcloudPath(): Promise<string | null> {
  if (GCLOUD_PATH) return GCLOUD_PATH;

  // Try which command first
  try {
    const { stdout } = await execAsync("which gcloud");
    const path = stdout.trim();
    if (path) {
      GCLOUD_PATH = path;
      return path;
    }
  } catch {
    // Continue to check common paths
  }

  // Check common installation paths
  for (const path of GCLOUD_PATHS) {
    try {
      await execAsync(`test -f "${path}"`);
      GCLOUD_PATH = path;
      return path;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Check if gcloud CLI is installed
 */
export async function checkGcloudInstalled(): Promise<boolean> {
  const path = await findGcloudPath();
  return path !== null;
}

/**
 * Get gcloud command with full path
 */
async function getGcloudCommand(): Promise<string> {
  const path = await findGcloudPath();
  if (!path) {
    throw new Error("gcloud CLI not found");
  }
  return path;
}

/**
 * Get list of all GCP project IDs and Names
 */
export async function getGCPProjects(): Promise<
  { id: string; name: string }[]
> {
  try {
    const gcloud = await getGcloudCommand();
    const { stdout } = await execAsync(
      `"${gcloud}" projects list --format="json(projectId,name)"`,
    );
    const projects = JSON.parse(stdout);
    return projects.map((p: { projectId: string; name?: string }) => ({
      id: p.projectId,
      name: p.name || p.projectId,
    }));
  } catch (error) {
    throw new Error(`Failed to get GCP projects: ${error}`);
  }
}

/**
 * Check detailed gcloud status
 */
export async function checkGcloudStatus(): Promise<GcloudStatusType> {
  // 1. Check if CLI exists
  const isInstalled = await checkGcloudInstalled();
  if (!isInstalled) {
    return {
      type: "error",
      message: "Gcloud CLI not found",
      errorType: "missing_cli",
    };
  }

  // 2. Try to list projects and get auth info
  try {
    const gcloud = await getGcloudCommand();

    // Check auth and get active account
    const { stdout } = await execAsync(
      `"${gcloud}" auth list --filter=status:ACTIVE --format="json(account)"`,
    );
    const authList = JSON.parse(stdout);
    const activeAccount = authList[0]?.account;

    if (!activeAccount) {
      return {
        type: "error",
        message: "Not logged in",
        errorType: "login_failed",
      };
    }

    // Verify project access by listing one
    await execAsync(`"${gcloud}" projects list --limit=1 --format="none"`);

    return {
      type: "success",
      message: "Connected",
      account: activeAccount,
    };
  } catch (error) {
    const errorStr = String(error);
    if (
      errorStr.includes("gcloud auth login") ||
      errorStr.includes("Not logged in")
    ) {
      return {
        type: "error",
        message: "Not logged in",
        errorType: "login_failed",
      };
    }
    return {
      type: "error",
      message: "Connection failed",
      errorType: "unknown",
    };
  }
}

/**
 * Helper to parse resource URL to get name
 */
function getNameFromUrl(url: string): string {
  return url.split("/").pop() || url;
}

/**
 * Search for an IP in a specific project
 */
export async function searchIPInProject(
  projectId: string,
  projectName: string,
  ip: string,
): Promise<SearchResult[]> {
  const gcloud = await getGcloudCommand();

  // Run searches in parallel and collect results arrays
  const results = await Promise.all([
    // Search in instances
    (async (): Promise<SearchResult[]> => {
      try {
        const { stdout } = await execAsync(
          `"${gcloud}" compute instances list --project "${projectId}" --filter="networkInterfaces.accessConfigs.natIP='${ip}' OR networkInterfaces.networkIP='${ip}'" --format="json(name,zone,status,labels,networkInterfaces,description,creationTimestamp)" 2>/dev/null`,
        );
        const instances = JSON.parse(stdout);
        const instanceResults: SearchResult[] = [];

        if (Array.isArray(instances)) {
          instances.forEach(
            (inst: {
              name: string;
              zone?: string;
              status?: string;
              labels?: Record<string, string>;
              description?: string;
              creationTimestamp?: string;
              networkInterfaces?: Array<{
                networkIP: string;
                subnetwork?: string;
                ipv6Address?: string;
                accessConfigs?: Array<{
                  natIP: string;
                  networkTier?: string;
                }>;
              }>;
            }) => {
              let internalIP = "";
              let externalIP = "";
              let networkTier = "";
              let subnetwork = "";
              let ipv6Address = "";

              // Find the matching IP in network interfaces
              const nic = inst.networkInterfaces?.find(
                (ni) =>
                  ni.networkIP === ip ||
                  ni.accessConfigs?.some((ac) => ac.natIP === ip) ||
                  ni.ipv6Address === ip,
              );

              if (nic) {
                internalIP = nic.networkIP;
                externalIP = nic.accessConfigs?.[0]?.natIP || "";
                networkTier = nic.accessConfigs?.[0]?.networkTier || "";
                subnetwork = nic.subnetwork
                  ? getNameFromUrl(nic.subnetwork)
                  : "";
                ipv6Address = nic.ipv6Address || "";
              }

              // If user searched for IPv6, make sure we got it
              if (!internalIP && !externalIP && !ipv6Address) {
                return;
              }

              // 1. Add the Instance Result
              instanceResults.push({
                projectId,
                projectName,
                resourceType: "instances",
                name: inst.name,
                zone: inst.zone ? getNameFromUrl(inst.zone) : undefined,
                ipAddress: ip,
                internalIP,
                externalIP,
                status: inst.status, // Raw status
                labels: inst.labels,
                networkTier,
                subnetwork,
                ipVersion: ipv6Address === ip ? "IPV6" : "IPV4",
                description: inst.description,
                creationTimestamp: inst.creationTimestamp,
              });

              // 2. Add a Synthetic Address Result for the IP
              // This ensures users see an "Address" row even for ephemeral IPs
              // We'll mark it as Ephemeral/IN_USE
              // Real Static Addresses (from the addresses block) will overwrite this if they exist (same ID)
              if (ip) {
                instanceResults.push({
                  projectId,
                  projectName,
                  resourceType: "addresses",
                  name: "-", // Use "-" as name for ephemeral per user request
                  region: inst.zone
                    ? getNameFromUrl(inst.zone).split("-").slice(0, 2).join("-")
                    : "global", // Estimate region from zone
                  ipAddress: ip,
                  status: "IN_USE",
                  isStatic: false,
                  addressType: externalIP === ip ? "EXTERNAL" : "INTERNAL",
                  networkTier: networkTier,
                  users: [inst.name], // It's used by this instance
                  description: `Attached to ${inst.name}`,
                  creationTimestamp: inst.creationTimestamp,
                });
              }
            },
          );
        }
        return instanceResults;
      } catch {
        return [];
      }
    })(),

    // Search in addresses
    (async (): Promise<SearchResult[]> => {
      try {
        const { stdout } = await execAsync(
          `"${gcloud}" compute addresses list --project "${projectId}" --filter="address='${ip}'" --format="json(name,region,address,status,addressType,ipVersion,users,networkTier,labels,subnetwork,description,creationTimestamp)" 2>/dev/null`,
        );
        const addresses = JSON.parse(stdout);
        const addressResults: SearchResult[] = [];

        if (Array.isArray(addresses)) {
          addresses.forEach(
            (addr: {
              name?: string;
              region?: string;
              address: string;
              status?: string;
              addressType?: string;
              ipVersion?: string;
              users?: string[];
              networkTier?: string;
              labels?: Record<string, string>;
              subnetwork?: string;
              description?: string;
              creationTimestamp?: string;
            }) => {
              const displayName = addr.name || addr.address || "-";
              const isEphemeral = !addr.name;

              const addressResult: SearchResult = {
                projectId,
                projectName,
                resourceType: "addresses",
                name: displayName,
                region: addr.region ? getNameFromUrl(addr.region) : "global",
                ipAddress: addr.address,
                status: addr.status, // Raw status
                isStatic: !isEphemeral,
                addressType: addr.addressType,
                ipVersion: addr.ipVersion,
                users: addr.users,
                networkTier: addr.networkTier,
                labels: addr.labels,
                subnetwork: addr.subnetwork
                  ? getNameFromUrl(addr.subnetwork)
                  : undefined,
                description: addr.description,
                creationTimestamp: addr.creationTimestamp,
              };

              addressResults.push(addressResult);

              // Check if used by a Cloud Router
              if (addr.users && addr.users.length > 0) {
                addr.users.forEach((userUrl) => {
                  if (userUrl.includes("/routers/")) {
                    const routerName = getNameFromUrl(userUrl);
                    const parts = userUrl.split("/");
                    const regionIndex = parts.indexOf("regions");
                    const routerRegion =
                      regionIndex !== -1 && parts.length > regionIndex + 1
                        ? parts[regionIndex + 1]
                        : addr.region
                          ? getNameFromUrl(addr.region)
                          : "global";

                    addressResults.push({
                      projectId,
                      projectName,
                      resourceType: "routers",
                      name: routerName,
                      region: routerRegion,
                      ipAddress: addr.address,
                      status: "IN_USE",
                      creationTimestamp: addr.creationTimestamp,
                    });
                  }
                });
              }
            },
          );
        }
        return addressResults;
      } catch {
        return [];
      }
    })(),

    // Search in forwarding rules
    (async (): Promise<SearchResult[]> => {
      try {
        const { stdout } = await execAsync(
          `"${gcloud}" compute forwarding-rules list --project "${projectId}" --filter="IPAddress='${ip}'" --format="json(name,region,IPAddress,IPProtocol,ports,target,loadBalancingScheme,networkTier,labels,description,creationTimestamp)" 2>/dev/null`,
        );
        const rules = JSON.parse(stdout);
        const fwResults: SearchResult[] = [];

        if (Array.isArray(rules)) {
          rules.forEach(
            (rule: {
              name: string;
              region?: string;
              IPAddress: string;
              labels?: Record<string, string>;
              networkTier?: string;
              description?: string;
              creationTimestamp?: string;
              loadBalancingScheme?: string;
            }) => {
              fwResults.push({
                projectId,
                projectName,
                resourceType: "forwarding-rules",
                name: rule.name,
                region: rule.region ? getNameFromUrl(rule.region) : "global",
                ipAddress: rule.IPAddress,
                labels: rule.labels,
                networkTier: rule.networkTier,
                description: rule.description,
                creationTimestamp: rule.creationTimestamp,
                status: rule.loadBalancingScheme,
              });

              // Add Synthetic Address for the Forwarding Rule's IP (for ephemeral IPs)
              if (rule.IPAddress) {
                fwResults.push({
                  projectId,
                  projectName,
                  resourceType: "addresses",
                  name: "-", // Synthetic name
                  region: rule.region ? getNameFromUrl(rule.region) : "global",
                  ipAddress: rule.IPAddress,
                  status: "IN_USE",
                  isStatic: false,
                  addressType: rule.loadBalancingScheme?.startsWith("INTERNAL")
                    ? "INTERNAL"
                    : "EXTERNAL",
                  networkTier: rule.networkTier,
                  description: `Attached to Forwarding Rule ${rule.name}`,
                  creationTimestamp: rule.creationTimestamp,
                });
              }
            },
          );
        }
        return fwResults;
      } catch {
        return [];
      }
    })(),
  ]);

  const [instanceResults, addressResults, forwardingResults] = results;

  // Deduplicate: If we found a Real Address (in addressResults), remove the Synthetic Address (in instanceResults AND forwardingResults) for the same IP.
  const realIPs = new Set(addressResults.map((r) => r.ipAddress));

  const filterSynthetic = (r: SearchResult) => {
    // If it's a synthetic address (resourceType 'addresses' and name usually equals the IP or "-"), check if we have a real one
    // Note: Synthetic addresses we created have name === "-" (or ipAddress in older versions)
    if (
      r.resourceType === "addresses" &&
      (r.name === "-" || r.name === r.ipAddress)
    ) {
      return !realIPs.has(r.ipAddress);
    }
    return true; // Keep other resources
  };

  const filteredInstanceResults = instanceResults.filter(filterSynthetic);
  const filteredForwardingResults = forwardingResults.filter(filterSynthetic);

  // Combine all results
  const allResults = [
    ...filteredInstanceResults,
    ...addressResults,
    ...filteredForwardingResults,
  ];

  // Deduplicate results based on a unique key
  // This ensures that even if gcloud returns duplicates (or if we had overlapping searches), we only return unique items
  const uniqueResultsMap = new Map<string, SearchResult>();

  allResults.forEach((result) => {
    // key: projectId-resourceType-name-region(-zone)
    const key = `${result.projectId}-${result.resourceType}-${result.name}-${result.region || ""}-${result.zone || ""}`;
    if (!uniqueResultsMap.has(key)) {
      uniqueResultsMap.set(key, result);
    }
  });

  return Array.from(uniqueResultsMap.values());
}

/**
 * Generate GCP Console URL with auto-filter for the IP
 */
export function generateConsoleURL(projectId: string, ip: string): string {
  // Using the same encoding logic from the shell script
  const encodedState = `%28%22allAddressesTable%22%3A%28%22f%22%3A%22%255B%257B_22k_22_3A_22_22_2C_22t_22_3A10_2C_22v_22_3A_22_5C_22${ip}_5C_22_22%257D%255D%22%29%29`;
  return `https://console.cloud.google.com/networking/addresses/list?project=${projectId}&pageState=${encodedState}`;
}

/**
 * Generate direct resource URL in GCP Console
 */
export function generateResourceURL(result: SearchResult): string {
  const { projectId, resourceType, name, zone, region, ipAddress } = result;

  switch (resourceType) {
    case "instances":
      // Direct link to VM instance
      return `https://console.cloud.google.com/compute/instancesDetail/zones/${zone}/instances/${name}?project=${projectId}`;

    case "forwarding-rules":
      // Direct link to forwarding rule details
      if (region && region !== "global") {
        return `https://console.cloud.google.com/net-services/loadbalancing/advanced/forwardingRules/details/regions/${region}/forwardingRules/${name}?project=${projectId}`;
      }
      return `https://console.cloud.google.com/net-services/loadbalancing/advanced/globalForwardingRules/details/${name}?project=${projectId}`;

    case "addresses": {
      // Direct link to address details with IP filter
      const encodedState = `%28%22allAddressesTable%22%3A%28%22f%22%3A%22%255B%257B_22k_22_3A_22_22_2C_22t_22_3A10_2C_22v_22_3A_22_5C_22${ipAddress}_5C_22_22%257D%255D%22%29%29`;
      return `https://console.cloud.google.com/networking/addresses/list?project=${projectId}&pageState=${encodedState}`;
    }

    case "routers":
      // Direct link to Cloud Router
      // URL: https://console.cloud.google.com/hybrid/routers/details/<region>/<routerName>?project=<projectId>
      if (region && region !== "global") {
        return `https://console.cloud.google.com/hybrid/routers/details/${region}/${name}?project=${projectId}`;
      }
      return `https://console.cloud.google.com/hybrid/routers/list?project=${projectId}`;

    default:
      return `https://console.cloud.google.com?project=${projectId}`;
  }
}

/**
 * Get resource icon based on type
 */
export function getResourceIcon(resourceType: string): string {
  switch (resourceType) {
    case "forwarding-rules":
      return "🔀";
    case "addresses":
      return "📍";
    case "instances":
      return "💻";
    case "routers":
      return "📡";
    default:
      return "🔍";
  }
}

/**
 * Get resource type display name
 */
export function getResourceTypeName(resourceType: string): string {
  switch (resourceType) {
    case "forwarding-rules":
      return "Forwarding Rule";
    case "addresses":
      return "Address";
    case "instances":
      return "Compute Instance";
    case "routers":
      return "Cloud Router";
    default:
      return "Resource";
  }
}
