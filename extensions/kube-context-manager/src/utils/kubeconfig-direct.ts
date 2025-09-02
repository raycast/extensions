import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { parse, stringify } from "yaml";
import { KubernetesContext, ClusterDetails } from "../types";
import { KubeconfigError, ValidationError } from "./errors";

// Default kubeconfig location
const DEFAULT_KUBECONFIG = join(homedir(), ".kube", "config");

interface KubeConfig {
  "current-context"?: string;
  contexts?: Array<{
    name: string;
    context: {
      cluster: string;
      user: string;
      namespace?: string;
    };
  }>;
  clusters?: Array<{
    name: string;
    cluster: {
      server?: string;
      "certificate-authority"?: string;
      "certificate-authority-data"?: string;
      "insecure-skip-tls-verify"?: boolean;
      [key: string]: unknown;
    };
  }>;
  users?: Array<{
    name: string;
    user: {
      "client-certificate"?: string;
      "client-certificate-data"?: string;
      "client-key"?: string;
      "client-key-data"?: string;
      token?: string;
      username?: string;
      password?: string;
      "auth-provider"?: Record<string, unknown>;
      exec?: Record<string, unknown>;
      [key: string]: unknown;
    };
  }>;
}

/**
 * Get the kubeconfig file path from environment or default
 */
function getKubeconfigPath(): string {
  return process.env.KUBECONFIG || DEFAULT_KUBECONFIG;
}

/**
 * Read and parse the kubeconfig file with enhanced error handling
 */
export function readKubeconfig(): KubeConfig {
  try {
    const kubeconfigPath = getKubeconfigPath();

    if (!existsSync(kubeconfigPath)) {
      throw new KubeconfigError(
        `Kubeconfig file not found at ${kubeconfigPath}`,
        "Create a kubeconfig file or set KUBECONFIG environment variable",
      );
    }

    const content = readFileSync(kubeconfigPath, "utf8");

    if (!content.trim()) {
      throw new KubeconfigError("Kubeconfig file is empty", "Add cluster configuration to your kubeconfig file");
    }

    const config = parse(content);
    if (!config || typeof config !== "object") {
      throw new KubeconfigError("Invalid kubeconfig format", "Check your kubeconfig syntax and structure");
    }

    return config;
  } catch (error) {
    if (error instanceof KubeconfigError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.message.includes("permission denied") || error.message.includes("EACCES")) {
        throw new KubeconfigError(
          "Permission denied accessing kubeconfig",
          "Fix file permissions: chmod 600 ~/.kube/config",
        );
      }

      if (error.message.includes("YAML")) {
        throw new KubeconfigError(
          "Invalid YAML syntax in kubeconfig",
          "Check your kubeconfig syntax or regenerate the file",
        );
      }
    }

    console.error("Failed to read kubeconfig:", error);
    throw new KubeconfigError("Failed to read kubeconfig file", "Check the file exists and is accessible");
  }
}

/**
 * Write kubeconfig back to file with enhanced error handling
 */
export function writeKubeconfig(config: KubeConfig): void {
  try {
    const kubeconfigPath = getKubeconfigPath();

    // Validate config structure
    if (!config || typeof config !== "object") {
      throw new ValidationError("Invalid kubeconfig data", "Ensure the configuration object is valid");
    }

    const content = stringify(config);

    if (!content.trim()) {
      throw new KubeconfigError("Empty kubeconfig content", "Configuration data appears to be empty");
    }

    // Create backup of existing file
    const backupPath = `${kubeconfigPath}.backup`;
    if (existsSync(kubeconfigPath)) {
      const existingContent = readFileSync(kubeconfigPath, "utf8");
      writeFileSync(backupPath, existingContent, "utf8");
    }

    writeFileSync(kubeconfigPath, content, "utf8");

    // Cleanup backup on successful write
    if (existsSync(backupPath)) {
      try {
        unlinkSync(backupPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
        console.warn("Failed to cleanup backup file:", cleanupError);
      }
    }
  } catch (error) {
    if (error instanceof ValidationError || error instanceof KubeconfigError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.message.includes("permission denied") || error.message.includes("EACCES")) {
        throw new KubeconfigError(
          "Permission denied writing kubeconfig",
          "Fix file permissions: chmod 600 ~/.kube/config",
        );
      }

      if (error.message.includes("ENOSPC")) {
        throw new KubeconfigError("No space left on device", "Free up disk space and try again");
      }
    }

    console.error("Failed to write kubeconfig:", error);
    throw new KubeconfigError("Failed to write kubeconfig file", "Check file permissions and disk space");
  }
}

/**
 * Get current context from kubeconfig
 */
export function getCurrentContext(): string | null {
  const config = readKubeconfig();
  return config["current-context"] || null;
}

/**
 * Get cluster details by name
 */
export function getClusterDetails(clusterName: string, config?: KubeConfig): ClusterDetails | null {
  const kubeConfig = config || readKubeconfig();
  const cluster = kubeConfig.clusters?.find((c) => c.name === clusterName);

  if (!cluster) {
    return null;
  }

  const server = cluster.cluster.server || "";
  const isSecure = !cluster.cluster["insecure-skip-tls-verify"];
  const hasCA = !!(cluster.cluster["certificate-authority"] || cluster.cluster["certificate-authority-data"]);

  let hostname = "Unknown";
  let port = "Unknown";
  let protocol = "Unknown";

  if (server) {
    try {
      const url = new URL(server);
      hostname = url.hostname;
      port = url.port || (server.startsWith("https://") ? "443" : "80");
      protocol = server.startsWith("https://") ? "HTTPS" : server.startsWith("http://") ? "HTTP" : "Unknown";
    } catch {
      // If URL parsing fails, extract basic info
      protocol = server.startsWith("https://") ? "HTTPS" : server.startsWith("http://") ? "HTTP" : "Unknown";
      const match = server.match(/\/\/([^:/]+)/);
      hostname = match ? match[1] : "Unknown";
    }
  }

  return {
    name: clusterName,
    server,
    isSecure,
    hasCA,
    protocol,
    hostname,
    port,
  };
}

/**
 * Get user authentication method
 */
export function getUserAuthMethod(userName: string, config?: KubeConfig) {
  const kubeConfig = config || readKubeconfig();
  const user = kubeConfig.users?.find((u) => u.name === userName);

  if (!user) {
    return "Unknown";
  }

  const userConfig = user.user;

  if (userConfig.token) return "Token";
  if (userConfig["client-certificate"] || userConfig["client-certificate-data"]) return "Client Certificate";
  if (userConfig.username && userConfig.password) return "Basic Auth";
  if (userConfig["auth-provider"]) return `Auth Provider (${userConfig["auth-provider"].name || "Unknown"})`;
  if (userConfig.exec) return `Exec (${userConfig.exec.command || "Unknown"})`;

  return "Unknown";
}

/**
 * Get all contexts from kubeconfig
 */
export function getAllContexts(): KubernetesContext[] {
  const config = readKubeconfig();
  const currentContext = config["current-context"];

  if (!config.contexts) {
    return [];
  }

  return config.contexts.map((ctx) => ({
    name: ctx.name,
    cluster: ctx.context.cluster,
    user: ctx.context.user,
    namespace: ctx.context.namespace,
    current: ctx.name === currentContext,
    clusterDetails: getClusterDetails(ctx.context.cluster, config),
    userAuthMethod: getUserAuthMethod(ctx.context.user, config),
  }));
}

/**
 * Switch to a different context
 */
export function switchToContext(contextName: string): boolean {
  try {
    const config = readKubeconfig();

    // Verify the context exists
    const contextExists = config.contexts?.some((ctx) => ctx.name === contextName);
    if (!contextExists) {
      throw new Error(`Context "${contextName}" not found`);
    }

    // Update current context
    config["current-context"] = contextName;

    // Write back to file
    writeKubeconfig(config);

    return true;
  } catch (error) {
    console.error("Failed to switch context:", error);
    return false;
  }
}

/**
 * Set namespace for a context
 */
export function setContextNamespace(contextName: string, namespace: string): boolean {
  try {
    const config = readKubeconfig();

    if (!config.contexts) {
      throw new Error("No contexts found in kubeconfig");
    }

    const contextIndex = config.contexts.findIndex((ctx) => ctx.name === contextName);
    if (contextIndex === -1) {
      throw new Error(`Context "${contextName}" not found`);
    }

    // Update namespace
    config.contexts[contextIndex].context.namespace = namespace;

    // Write back to file
    writeKubeconfig(config);

    return true;
  } catch (error) {
    console.error("Failed to set context namespace:", error);
    return false;
  }
}

/**
 * Get available namespaces (common ones + context-specific ones)
 */
export function getCommonNamespaces(): string[] {
  // Common Kubernetes namespaces
  return ["default", "kube-system", "kube-public", "kube-node-lease"];
}

/**
 * Get all unique namespaces from existing contexts
 */
export function getNamespacesFromContexts(): string[] {
  const config = readKubeconfig();
  const namespaces = new Set<string>();

  if (config.contexts) {
    config.contexts.forEach((ctx) => {
      if (ctx.context.namespace) {
        namespaces.add(ctx.context.namespace);
      }
    });
  }

  // Always include default
  namespaces.add("default");

  return Array.from(namespaces).sort();
}

/**
 * Get all available namespaces (common + from contexts)
 */
export function getAllAvailableNamespaces(): string[] {
  const common = getCommonNamespaces();
  const fromContexts = getNamespacesFromContexts();

  // Combine and deduplicate
  const all = new Set([...common, ...fromContexts]);
  return Array.from(all).sort();
}

/**
 * Switch context and optionally set namespace
 */
export function switchToContextWithNamespace(contextName: string, namespace?: string): boolean {
  try {
    const config = readKubeconfig();

    // Verify the context exists
    const contextExists = config.contexts?.some((ctx) => ctx.name === contextName);
    if (!contextExists) {
      throw new Error(`Context "${contextName}" not found`);
    }

    // If namespace is provided, set it for the context first
    if (namespace) {
      const contextIndex = config.contexts!.findIndex((ctx) => ctx.name === contextName);
      if (contextIndex !== -1) {
        config.contexts![contextIndex].context.namespace = namespace;
      }
    }

    // Update current context
    config["current-context"] = contextName;

    // Write back to file
    writeKubeconfig(config);

    return true;
  } catch (error) {
    console.error("Failed to switch context with namespace:", error);
    return false;
  }
}

/**
 * Check if kubeconfig file exists and is readable
 */
export function isKubeconfigAvailable(): boolean {
  try {
    const kubeconfigPath = getKubeconfigPath();
    readFileSync(kubeconfigPath, "utf8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Get kubeconfig file information
 */
export function getKubeconfigInfo() {
  const kubeconfigPath = getKubeconfigPath();
  const available = isKubeconfigAvailable();

  let contextCount = 0;
  let currentContext = null;

  if (available) {
    const contexts = getAllContexts();
    contextCount = contexts.length;
    currentContext = getCurrentContext();
  }

  return {
    path: kubeconfigPath,
    available,
    contextCount,
    currentContext,
  };
}

/**
 * Create a new context
 */
export function createContext(
  name: string,
  clusterName: string,
  userName: string,
  namespace?: string,
  clusterServer?: string,
): boolean {
  try {
    const config = readKubeconfig();

    // Check if context already exists
    const existingContext = config.contexts?.find((ctx) => ctx.name === name);
    if (existingContext) {
      throw new Error(`Context "${name}" already exists`);
    }

    // Ensure arrays exist
    if (!config.contexts) {
      config.contexts = [];
    }
    if (!config.clusters) {
      config.clusters = [];
    }
    if (!config.users) {
      config.users = [];
    }

    // Check if cluster exists, if not create a basic one
    const existingCluster = config.clusters.find((c) => c.name === clusterName);
    if (!existingCluster) {
      const newCluster = {
        name: clusterName,
        cluster: {
          ...(clusterServer && { server: clusterServer }),
          // Add basic cluster configuration
          "insecure-skip-tls-verify": true,
        },
      };
      config.clusters.push(newCluster);
    }

    // Check if user exists, if not create a basic one
    const existingUser = config.users.find((u) => u.name === userName);
    if (!existingUser) {
      const newUser = {
        name: userName,
        user: {
          // Create a placeholder user - actual auth config would need to be added separately
        },
      };
      config.users.push(newUser);
    }

    // Add the new context
    const newContext = {
      name,
      context: {
        cluster: clusterName,
        user: userName,
        ...(namespace && { namespace }),
      },
    };

    config.contexts.push(newContext);

    // Write back to file
    writeKubeconfig(config);

    return true;
  } catch (error) {
    console.error("Failed to create context:", error);
    throw error;
  }
}

/**
 * Delete an existing context
 */
export function deleteContext(contextName: string): boolean {
  try {
    const config = readKubeconfig();

    if (!config.contexts) {
      throw new Error("No contexts found in kubeconfig");
    }

    // Find the context
    const contextIndex = config.contexts.findIndex((ctx) => ctx.name === contextName);
    if (contextIndex === -1) {
      throw new Error(`Context "${contextName}" not found`);
    }

    // Don't delete if it's the current context
    if (config["current-context"] === contextName) {
      throw new Error(`Cannot delete current context "${contextName}". Switch to another context first.`);
    }

    // Remove the context
    config.contexts.splice(contextIndex, 1);

    // Write back to file
    writeKubeconfig(config);

    return true;
  } catch (error) {
    console.error("Failed to delete context:", error);
    throw error;
  }
}

/**
 * Modify an existing context
 */
export function modifyContext(
  contextName: string,
  updates: {
    newName?: string;
    cluster?: string;
    user?: string;
    namespace?: string;
  },
): boolean {
  try {
    const config = readKubeconfig();

    if (!config.contexts) {
      throw new Error("No contexts found in kubeconfig");
    }

    // Find the context
    const contextIndex = config.contexts.findIndex((ctx) => ctx.name === contextName);
    if (contextIndex === -1) {
      throw new Error(`Context "${contextName}" not found`);
    }

    const context = config.contexts[contextIndex];

    // Check if new name conflicts with existing contexts
    if (updates.newName && updates.newName !== contextName) {
      const existingContext = config.contexts.find((ctx) => ctx.name === updates.newName);
      if (existingContext) {
        throw new Error(`Context name "${updates.newName}" already exists`);
      }

      // Update current-context reference if this context is current
      if (config["current-context"] === contextName) {
        config["current-context"] = updates.newName;
      }

      // Update the name
      context.name = updates.newName;
    }

    // Update context properties
    if (updates.cluster !== undefined) {
      context.context.cluster = updates.cluster;
    }

    if (updates.user !== undefined) {
      context.context.user = updates.user;
    }

    if (updates.namespace !== undefined) {
      if (updates.namespace === "") {
        // Remove namespace if empty string is provided
        delete context.context.namespace;
      } else {
        context.context.namespace = updates.namespace;
      }
    }

    // Write back to file
    writeKubeconfig(config);

    return true;
  } catch (error) {
    console.error("Failed to modify context:", error);
    throw error;
  }
}

/**
 * Get all available clusters from kubeconfig
 */
export function getAllClusters(): Array<{ name: string; server?: string }> {
  const config = readKubeconfig();

  if (!config.clusters) {
    return [];
  }

  return config.clusters.map((cluster) => ({
    name: cluster.name,
    server: cluster.cluster.server,
  }));
}

/**
 * Get all available users from kubeconfig
 */
export function getAllUsers(): Array<{ name: string; authMethod?: string }> {
  const config = readKubeconfig();

  if (!config.users) {
    return [];
  }

  return config.users.map((user) => ({
    name: user.name,
    authMethod: getUserAuthMethod(user.name, config),
  }));
}
