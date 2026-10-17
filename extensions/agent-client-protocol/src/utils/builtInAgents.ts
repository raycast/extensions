/**
 * Built-in Agent Configurations
 *
 * Pre-configured agent setups for popular ACP-compatible agents
 * to provide users with working examples out of the box.
 */

import type { AgentConfig } from "@/types/extension";
import { createLogger } from "./logging";

const logger = createLogger("BuiltInAgents");

/**
 * Built-in agent configurations
 * These are provided as working examples and cannot be modified by users
 */
export const BUILT_IN_AGENTS: readonly AgentConfig[] = [
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    type: "subprocess",
    command: "gemini",
    args: ["--acp"],
    workingDirectory: process.cwd(),
    environmentVariables: {},
    isBuiltIn: true,
    description: "Google's Gemini AI agent with Agent Client Protocol support. Requires Gemini CLI to be installed.",
    createdAt: new Date("2025-01-01T00:00:00Z"), // Static date for built-ins
  },
  {
    id: "claude-code",
    name: "Claude Code",
    type: "subprocess",
    command: "claude-code-acp",
    args: [],
    workingDirectory: process.cwd(),
    environmentVariables: {},
    isBuiltIn: true,
    description: "Anthropic's Claude Code agent via Zed's ACP adapter. Requires claude-code-acp to be installed.",
    createdAt: new Date("2025-01-01T00:00:00Z"),
  },
  {
    id: "goose",
    name: "Goose",
    type: "subprocess",
    command: "goose",
    args: ["acp"],
    workingDirectory: process.cwd(),
    environmentVariables: {},
    isBuiltIn: true,
    description: "Block's Goose AI agent with ACP support. Requires Goose to be installed.",
    createdAt: new Date("2025-01-01T00:00:00Z"),
  },
] as const;

/**
 * Agent templates for users to create custom configurations
 */
export const AGENT_TEMPLATES: readonly Partial<AgentConfig>[] = [
  {
    name: "Custom Local Agent",
    type: "subprocess",
    command: "your-agent-command",
    args: ["--acp"],
    workingDirectory: process.cwd(),
    description: "Template for a custom local agent that supports ACP protocol",
  },
  {
    name: "Remote ACP Agent",
    type: "remote",
    endpoint: "ws://localhost:8080/acp",
    description: "Template for connecting to a remote ACP agent via WebSocket",
  },
  {
    name: "Docker Agent",
    type: "subprocess",
    command: "docker",
    args: ["run", "-i", "--rm", "your-agent-image", "--acp"],
    workingDirectory: process.cwd(),
    description: "Template for running an ACP agent in a Docker container",
  },
] as const;

/**
 * Agent installation guides
 */
export const INSTALLATION_GUIDES: Record<
  string,
  {
    name: string;
    description: string;
    installCommand?: string;
    installUrl?: string;
    requirements: string[];
    verifyCommand?: string;
  }
> = {
  "gemini-cli": {
    name: "Gemini CLI",
    description: "Install Google's Gemini CLI for AI assistance",
    installCommand: "npm install -g @google-ai/generativelanguage-cli",
    installUrl: "https://github.com/google-gemini/gemini-cli",
    requirements: ["Node.js 18+", "Google AI API key", "Internet connection"],
    verifyCommand: "gemini --version",
  },
  "claude-code": {
    name: "Claude Code",
    description: "Install Anthropic's Claude Code via Zed's ACP adapter",
    installUrl: "https://github.com/zed-industries/claude-code-acp",
    requirements: ["Anthropic API key", "Zed editor or standalone installation", "Internet connection"],
    verifyCommand: "claude-code --version",
  },
  goose: {
    name: "Goose",
    description: "Install Block's Goose AI agent",
    installCommand: "pip install goose-ai",
    installUrl: "https://block.github.io/goose/",
    requirements: ["Python 3.8+", "OpenAI or other AI provider API key", "Internet connection"],
    verifyCommand: "goose --version",
  },
} as const;

/**
 * Check if an agent is built-in
 */
export function isBuiltInAgent(agentId: string): boolean {
  return BUILT_IN_AGENTS.some((agent) => agent.id === agentId);
}

/**
 * Get built-in agent by ID
 */
export function getBuiltInAgent(agentId: string): AgentConfig | undefined {
  return BUILT_IN_AGENTS.find((agent) => agent.id === agentId);
}

/**
 * Get all built-in agent IDs
 */
export function getBuiltInAgentIds(): string[] {
  return BUILT_IN_AGENTS.map((agent) => agent.id);
}

/**
 * Get agent template by name
 */
export function getAgentTemplate(name: string): Partial<AgentConfig> | undefined {
  return AGENT_TEMPLATES.find((template) => template.name === name);
}

/**
 * Create agent config from template
 */
export function createAgentFromTemplate(
  templateName: string,
  customizations: Partial<AgentConfig>,
): Omit<AgentConfig, "id" | "createdAt"> {
  const template = getAgentTemplate(templateName);
  if (!template) {
    throw new Error(`Template not found: ${templateName}`);
  }

  return {
    ...template,
    ...customizations,
    isBuiltIn: false,
  } as Omit<AgentConfig, "id" | "createdAt">;
}

/**
 * Validate agent configuration
 */
export function validateAgentConfig(config: Partial<AgentConfig>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!config.name?.trim()) {
    errors.push("Agent name is required");
  }

  if (!config.type) {
    errors.push("Agent type is required");
  }

  // Type-specific validation
  if (config.type === "subprocess") {
    if (!config.command?.trim()) {
      errors.push("Command is required for subprocess agents");
    }
  } else if (config.type === "remote") {
    if (!config.endpoint?.trim()) {
      errors.push("Endpoint is required for remote agents");
    } else {
      // Basic URL validation
      try {
        new URL(config.endpoint);
      } catch {
        errors.push("Invalid endpoint URL format");
      }
    }
  }

  // Name validation
  if (config.name && config.name.length > 50) {
    errors.push("Agent name must be 50 characters or less");
  }

  // Description validation
  if (config.description && config.description.length > 200) {
    errors.push("Description must be 200 characters or less");
  }

  if (config.appendToPath) {
    const invalidSegments = config.appendToPath.filter((segment) => !segment?.trim());
    if (invalidSegments.length > 0) {
      errors.push("Append to PATH entries must be non-empty");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if agent command is available on system
 */
export async function checkAgentAvailability(config: AgentConfig): Promise<{
  isAvailable: boolean;
  error?: string;
  details?: string;
  latencyMs?: number;
}> {
  if (config.type !== "subprocess" || !config.command) {
    return { isAvailable: true }; // Can't check remote agents
  }

  try {
    const { spawn } = await import("child_process");

    const baseEnv: NodeJS.ProcessEnv = { ...process.env };
    const mergedEnv: NodeJS.ProcessEnv = { ...baseEnv, ...(config.environmentVariables ?? {}) };

    if (config.appendToPath?.length) {
      const currentPath = mergedEnv.PATH ?? mergedEnv.Path ?? mergedEnv.path ?? process.env.PATH ?? "";

      const pathSegments = currentPath
        ? currentPath
            .split(":")
            .map((segment) => segment.trim())
            .filter(Boolean)
        : [];

      for (const segment of config.appendToPath) {
        if (segment && !pathSegments.includes(segment)) {
          pathSegments.push(segment);
        }
      }

      if (pathSegments.length > 0) {
        const finalPath = pathSegments.join(":");
        mergedEnv.PATH = finalPath;
        mergedEnv.Path = finalPath;
        mergedEnv.path = finalPath;
      }
    }

    const args = config.args && config.args.length > 0 ? [...config.args] : ["--version"];
    const isLongRunningCheck = args.some((arg) => arg !== "--version");

    logger.info("Checking agent availability", {
      agentId: config.id,
      command: config.command,
      args,
      cwd: config.workingDirectory || process.cwd(),
      path: mergedEnv.PATH,
    });

    return new Promise((resolve) => {
      const startedAt = Date.now();
      const child = spawn(config.command!, args, {
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 0,
        cwd: config.workingDirectory || process.cwd(),
        env: mergedEnv,
      });

      let resolved = false;
      let stderr = "";
      let stdout = "";
      let successTimer: NodeJS.Timeout | null = null;
      let timeoutTimer: NodeJS.Timeout | null = null;

      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      const finalize = (result: { isAvailable: boolean; error?: string; details?: string }) => {
        if (resolved) {
          return;
        }
        resolved = true;
        const latencyMs = Date.now() - startedAt;
        const payload = { ...result, latencyMs };
        if (successTimer) {
          clearTimeout(successTimer);
        }
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
        }
        resolve(payload);
      };

      if (isLongRunningCheck) {
        successTimer = setTimeout(() => {
          logger.info("Agent long-running command started successfully", {
            agentId: config.id,
            command: config.command,
            args,
            path: mergedEnv.PATH,
          });
          finalize({ isAvailable: true });
          child.kill();
          setTimeout(() => child.kill("SIGKILL"), 1000);
        }, 3000);
      }

      timeoutTimer = setTimeout(
        () => {
          if (!resolved) {
            logger.warn("Agent availability check timed out", {
              agentId: config.id,
              command: config.command,
              args,
              path: mergedEnv.PATH,
            });
            child.kill();
            setTimeout(() => child.kill("SIGKILL"), 1000);
            finalize({
              isAvailable: false,
              error: "Command check timed out",
            });
          }
        },
        isLongRunningCheck ? 10000 : 5000,
      );

      child.on("error", (error) => {
        if (resolved) {
          return;
        }
        logger.error("Agent availability check failed", {
          agentId: config.id,
          command: config.command,
          error: error.message,
          path: mergedEnv.PATH,
        });
        finalize({
          isAvailable: false,
          error: `Command not found: ${config.command}`,
          details: error.message,
        });
      });

      child.on("exit", (code, signal) => {
        if (resolved) {
          return;
        }
        if (code === 0) {
          finalize({ isAvailable: true });
          return;
        }

        const message =
          code !== null ? `Command exited with code ${code}` : `Command terminated by signal ${signal ?? "unknown"}`;

        logger.warn("Agent availability command exited with error", {
          agentId: config.id,
          command: config.command,
          exitCode: code,
          signal,
          stderr: stderr.trim(),
          stdout: stdout.trim(),
          path: mergedEnv.PATH,
        });

        finalize({
          isAvailable: false,
          error: message,
          details: stderr.trim() || stdout.trim() || undefined,
        });
      });

      // Timeout fallback
      // handled above with timeoutTimer
    });
  } catch (error) {
    return {
      isAvailable: false,
      error: `Failed to check availability: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get installation guide for agent
 */
export function getInstallationGuide(agentId: string): (typeof INSTALLATION_GUIDES)[string] | undefined {
  return INSTALLATION_GUIDES[agentId];
}

/**
 * Generate unique agent ID
 */
export function generateAgentId(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const timestamp = Date.now().toString(36);
  return `${sanitized}-${timestamp}`;
}
