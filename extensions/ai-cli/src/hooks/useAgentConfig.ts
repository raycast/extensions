import { useCallback, useMemo } from "react";
import { ExtensionPreferences } from "../types";
import { validateDirectory } from "@/utils/validation";
import { expandPath, validateExecutablePath } from "@/utils/path";
import { getAgent } from "@/agents";

interface AgentConfig {
  agentId: string;
  agentPath: string;
  agentToken: string;
  workingDir: string;
  expandedAgentPath: string;
  shellPath: string;
  expandedShellPath: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface UseAgentConfigReturn {
  config: AgentConfig;
  expandPath: (path: string) => string;
  getEnvironmentConfig: () => Record<string, string>;
}

export function useAgentConfig(preferences: ExtensionPreferences, agentId?: string): UseAgentConfigReturn {
  const agent = getAgent(agentId || preferences.selectedAgent);

  const config = useMemo((): AgentConfig => {
    // Dynamically get the path and token for the selected agent
    const agentPath = preferences[agent.pathPreferenceKey as keyof ExtensionPreferences] as string;
    const agentToken = preferences[agent.tokenPreferenceKey as keyof ExtensionPreferences] as string;

    const workingDir = expandPath(preferences.agentWorkingDir);
    const expandedAgentPath = expandPath(agentPath);
    const expandedShellPath = expandPath(preferences.shellPath);
    const agentPathValidation = agent.validatePath(agentPath);

    const workingDirValidation = validateDirectory(workingDir);
    const shellPathValidation = validateExecutablePath(preferences.shellPath);

    const errors: string[] = [];
    const warnings: string[] = [];

    if (agentPathValidation.error) {
      errors.push(agentPathValidation.error);
    }
    if (workingDirValidation.error) {
      errors.push(workingDirValidation.error);
    }
    if (shellPathValidation.error) {
      errors.push(shellPathValidation.error);
    }

    if (agentPathValidation.warning) {
      warnings.push(agentPathValidation.warning);
    }
    if (shellPathValidation.warning) {
      warnings.push(shellPathValidation.warning);
    }

    return {
      agentId: agent.id,
      agentPath,
      agentToken,
      workingDir,
      expandedAgentPath,
      shellPath: preferences.shellPath,
      expandedShellPath,
      isValid: agentPathValidation.valid && workingDirValidation.valid && shellPathValidation.valid,
      errors,
      warnings,
    };
  }, [agentId, preferences.agentWorkingDir, preferences.shellPath, agent, preferences]);

  const getEnvironmentConfig = useCallback((): Record<string, string> => {
    const commandConfig: Record<string, string> = {
      NO_COLOR: "1",
      CI: "true",
    };

    const agentToken = preferences[agent.tokenPreferenceKey as keyof ExtensionPreferences] as string;
    if (agentToken) {
      commandConfig[agent.authEnvVar] = agentToken.trim();
    }

    return commandConfig;
  }, [preferences, agent]);

  return {
    config,
    expandPath,
    getEnvironmentConfig,
  };
}
