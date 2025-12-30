import { useState, useEffect, useCallback } from "react";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { Cache } from "@raycast/api";
import { AI_TOOL_DEFINITIONS, AIToolDefinition } from "../constants";

// ============================================
// AI CLI Tool Types
// ============================================

export interface AITool extends AIToolDefinition {
  installed: boolean;
}

// ============================================
// Detection Helper
// ============================================

/** Common installation paths for AI CLI tools */
const COMMON_PATHS: Record<string, string[]> = {
  claude: [`${homedir()}/.local/bin/claude`, `${homedir()}/.claude/local/claude`, "/usr/local/bin/claude"],
  codex: [`${homedir()}/.nvm/versions/node/*/bin/codex`, "/usr/local/bin/codex", `${homedir()}/.npm-global/bin/codex`],
  gemini: [`${homedir()}/.local/bin/gemini`, "/usr/local/bin/gemini", `${homedir()}/.npm-global/bin/gemini`],
};

/**
 * Check if a command is installed.
 * Uses fast file existence checks for reliability in Raycast environment.
 */
function isCommandInstalled(command: string): boolean {
  const paths = COMMON_PATHS[command] || [];

  for (const pathPattern of paths) {
    if (pathPattern.includes("*")) {
      try {
        const result = execSync(`ls ${pathPattern} 2>/dev/null`, {
          encoding: "utf-8",
          timeout: 1000,
        });
        if (result.trim()) return true;
      } catch {
        // Continue to next path
      }
    } else if (existsSync(pathPattern)) {
      return true;
    }
  }

  return false;
}

// ============================================
// Cache
// ============================================

const cache = new Cache();
const CACHE_KEY = "ai-tools-detection";

function getCachedTools(): AITool[] | null {
  try {
    const cached = cache.get(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Handle both old format { tools: [], timestamp } and new format []
      if (Array.isArray(parsed)) {
        return parsed as AITool[];
      }
      if (parsed && Array.isArray(parsed.tools)) {
        return parsed.tools as AITool[];
      }
    }
  } catch {
    // Cache read failed
  }
  return null;
}

function setCachedTools(tools: AITool[]): void {
  cache.set(CACHE_KEY, JSON.stringify(tools));
}

// ============================================
// useAITools Hook
// ============================================

interface UseAIToolsReturn {
  tools: AITool[];
  installedTools: AITool[];
  allToolDefinitions: AIToolDefinition[];
  isLoading: boolean;
  refresh: () => void;
}

// Initialize from cache synchronously to avoid flash of empty state
function getInitialTools(): AITool[] {
  return getCachedTools() ?? [];
}

export function useAITools(): UseAIToolsReturn {
  const [tools, setTools] = useState<AITool[]>(getInitialTools);
  const [isLoading, setIsLoading] = useState(() => getInitialTools().length === 0);

  const detectTools = useCallback(() => {
    setIsLoading(true);

    const detectedTools = AI_TOOL_DEFINITIONS.map((tool) => ({
      ...tool,
      installed: isCommandInstalled(tool.command),
    }));

    setTools(detectedTools);
    setCachedTools(detectedTools);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (tools.length === 0) {
      detectTools();
    }
  }, [detectTools, tools.length]);

  const installedTools = tools.filter((tool) => tool.installed);

  return {
    tools,
    installedTools,
    allToolDefinitions: AI_TOOL_DEFINITIONS,
    isLoading,
    refresh: detectTools,
  };
}
