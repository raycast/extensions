import { exec } from "child_process";
import { promisify } from "util";
import { getPreferenceValues } from "@raycast/api";
import * as fs from "fs";

export const execAsync = promisify(exec);

export interface ClaudeCodeConfig {
  alias: string;
  emoji: string;
  ANTHROPIC_BASE_URL: string;
  ANTHROPIC_AUTH_TOKEN: string;
  ANTHROPIC_MODEL: string;
  ANTHROPIC_SMALL_FAST_MODEL: string;
}

export function getConfigOptions(): ClaudeCodeConfig[] {
  const preferences = getPreferenceValues();

  try {
    if (preferences.configurations) {
      const configs = JSON.parse(preferences.configurations);
      if (Array.isArray(configs) && configs.length > 0) {
        return configs;
      }
    }
  } catch {
    console.error("Error parsing configurations JSON");
  }

  // Return default configurations if JSON parsing fails or no configurations provided
  return [
    {
      alias: "DEEPSEEK",
      emoji: "🚀",
      ANTHROPIC_BASE_URL: "https://api.anthropic.com",
      ANTHROPIC_AUTH_TOKEN: "your_production_token_here",
      ANTHROPIC_MODEL: "claude-3-opus-20240229",
      ANTHROPIC_SMALL_FAST_MODEL: "claude-3-haiku-20240307",
    },
    {
      alias: "KIMI",
      emoji: "🧪",
      ANTHROPIC_BASE_URL: "https://api.staging.anthropic.com",
      ANTHROPIC_AUTH_TOKEN: "your_staging_token_here",
      ANTHROPIC_MODEL: "claude-3-sonnet-20240229",
      ANTHROPIC_SMALL_FAST_MODEL: "claude-3-haiku-20240307",
    },
    {
      alias: "Development",
      emoji: "🔧",
      ANTHROPIC_BASE_URL: "https://api.dev.anthropic.com",
      ANTHROPIC_AUTH_TOKEN: "your_dev_token_here",
      ANTHROPIC_MODEL: "claude-3-haiku-20240307",
      ANTHROPIC_SMALL_FAST_MODEL: "claude-3-haiku-20240307",
    },
    {
      alias: "Local",
      emoji: "💻",
      ANTHROPIC_BASE_URL: "http://localhost:8080",
      ANTHROPIC_AUTH_TOKEN: "your_local_token_here",
      ANTHROPIC_MODEL: "claude-3-haiku-20240307",
      ANTHROPIC_SMALL_FAST_MODEL: "claude-3-haiku-20240307",
    },
  ];
}

export async function getCurrentConfig(): Promise<Partial<ClaudeCodeConfig> | null> {
  try {
    // First, try to read from the dedicated environment file
    const envFilePath = `${process.env.HOME}/.claude-code-env`;

    try {
      const { stdout } = await execAsync(`[ -f ${envFilePath} ] && cat ${envFilePath} || echo ""`);

      if (stdout.trim()) {
        const currentConfig: Partial<ClaudeCodeConfig> = {};
        const lines = stdout.trim().split("\n");

        lines.forEach((line) => {
          const match = line.match(/^export (ANTHROPIC_[A-Z_]+)="([^"]+)"/);
          if (match) {
            const [, key, value] = match;
            currentConfig[key as keyof ClaudeCodeConfig] = value;
          }
        });

        if (Object.keys(currentConfig).length > 0) {
          return currentConfig;
        }
      }
    } catch {
      // File doesn't exist or can't be read, silently continue
    }

    // Fallback: check current environment variables
    try {
      const { stdout } = await execAsync(`env | grep ANTHROPIC_ || echo ""`);

      if (stdout.trim()) {
        const currentConfig: Partial<ClaudeCodeConfig> = {};
        const lines = stdout.trim().split("\n");

        lines.forEach((line) => {
          const [key, value] = line.split("=");
          if (key && value) {
            currentConfig[key as keyof ClaudeCodeConfig] = value;
          }
        });

        if (Object.keys(currentConfig).length > 0) {
          return currentConfig;
        }
      }
    } catch {
      // Environment variables not set, silently continue
    }

    return null;
  } catch {
    // Silently handle all errors, return null if can't determine config
    return null;
  }
}

export async function updateEnvironmentVariables(config: ClaudeCodeConfig): Promise<void> {
  try {
    // Create a dedicated environment file instead of modifying .zshrc
    const envContent = `# Claude Code Environment Configuration
export ANTHROPIC_BASE_URL="${config.ANTHROPIC_BASE_URL}"
export ANTHROPIC_AUTH_TOKEN="${config.ANTHROPIC_AUTH_TOKEN}"
export ANTHROPIC_MODEL="${config.ANTHROPIC_MODEL}"
export ANTHROPIC_SMALL_FAST_MODEL="${config.ANTHROPIC_SMALL_FAST_MODEL}"

# To use these settings, run: source ~/.claude-code-env
`;

    fs.writeFileSync(`${process.env.HOME}/.claude-code-env`, envContent);

    // Also create a convenience script to apply the environment
    const applyScript = `#!/bin/zsh
source ${process.env.HOME}/.claude-code-env
echo "Claude Code environment configured for ${config.alias}"
`;

    fs.writeFileSync(`${process.env.HOME}/.claude-code-apply`, applyScript);
    fs.chmodSync(`${process.env.HOME}/.claude-code-apply`, "755");
  } catch (error) {
    console.error("Error updating environment variables:", error);
    throw error;
  }
}

export function isConfigActive(config: ClaudeCodeConfig, currentConfig: Partial<ClaudeCodeConfig> | null): boolean {
  if (!currentConfig) return false;
  return (
    currentConfig.ANTHROPIC_BASE_URL === config.ANTHROPIC_BASE_URL &&
    currentConfig.ANTHROPIC_MODEL === config.ANTHROPIC_MODEL
  );
}
