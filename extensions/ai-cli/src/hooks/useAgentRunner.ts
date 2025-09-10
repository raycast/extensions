import { useCallback, useMemo, useRef, useState } from "react";
import { useExec } from "@raycast/utils";
import { ExtensionPreferences, FormValues } from "../types";
import type { RunnerState, UseAgentRunnerReturn } from "@/types/agent-runner";
import type { AgentProcessingParams } from "@/types";
import { generateFullPrompt } from "@/templates";
import { createAgentCommand, createExecutionConfig, getAgent } from "@/agents";
import { usePromptActionContext } from "@/contexts/PromptActionContext";
import { useAgentConfig } from "./useAgentConfig";

import { v4 as uuidv4 } from "uuid";

/**
 * Single execution runner that owns prompt building, command building, useExec wiring and streaming.
 * Exposes raw errors; no user-facing error handling here.
 */
export function useAgentRunner(
  agentId: string,
  preferences: ExtensionPreferences,
  executionState: RunnerState | null,
  targetFolder?: string
): UseAgentRunnerReturn {
  const { getToneById, getTemplateById } = usePromptActionContext();
  const { config: agentConfig, getEnvironmentConfig } = useAgentConfig(preferences, agentId);

  const environment = useMemo(() => getEnvironmentConfig(), [agentId, getEnvironmentConfig]);
  const executionConfig = useMemo(() => createExecutionConfig(environment), [environment]);

  const generatePrompt = useCallback(
    (values: FormValues, inputText: string, maxLength: number, isFollowUp?: boolean): string => {
      return generateFullPrompt(values, inputText, maxLength, getToneById, getTemplateById, isFollowUp);
    },
    [getToneById, getTemplateById, agentConfig.expandedShellPath]
  );

  const createExecutionState = useCallback(
    (
      params: AgentProcessingParams,
      isAdditionalVariant: boolean,
      isFollowUp = false,
      executionId: string = uuidv4()
    ): RunnerState => {
      const prompt = generatePrompt(params.values, params.inputText, executionConfig.maxInputLength, isFollowUp);

      // Get model from agent's model config
      const agent = getAgent(params.values.selectedAgent);
      const modelId = params.values.model
        ? Object.values(agent.models).find((m) => m.displayName === params.values.model)?.id
        : agent.models[agent.defaultModel]?.id;

      const commandSpec = createAgentCommand({
        agentId: params.values.selectedAgent,
        prompt,
        agentPath: agentConfig.expandedAgentPath,
        executionId,
        model: modelId,
        continueConversation: isFollowUp,
      });

      return {
        commandSpec,
        isAdditionalVariant,
        isFollowUp,
        executionId,
        originalPrompt: prompt,
        agentId: params.values.selectedAgent,
      };
    },
    [generatePrompt, agentConfig, executionConfig.maxInputLength]
  );

  const [data, setData] = useState("");
  const [manualError, setManualError] = useState<Error | null>(null);
  const runIdRef = useRef(0);
  const { error: execError, isLoading } = useExec(
    executionState?.commandSpec.file || agentConfig.expandedShellPath,
    executionState?.commandSpec.args || [],
    {
      cwd: targetFolder || agentConfig.workingDir,
      timeout: executionConfig.timeout,
      env: {
        ...executionConfig.environment,
        RUN_ID: String(runIdRef.current),
      },
      execute: !!executionState && agentConfig.isValid,
      keepPreviousData: false,
      stripFinalNewline: false,
      input: executionState?.originalPrompt || undefined,
      onData: (newLines) => {
        setData((prev) => prev + newLines.toString());
      },
    }
  );

  const executeCommand = useCallback(() => {
    // Clear previous output and manual errors
    setData("");
    setManualError(null);

    if (!agentConfig.isValid) {
      setManualError(new Error("Invalid agent configuration"));
      return;
    }

    // Bump RUN_ID so useExec sees env changes and re-executes reliably
    runIdRef.current += 1;
  }, [agentConfig.isValid]);

  return {
    executeCommand,
    createExecutionState,
    isExecuting: isLoading,
    executionData: !isLoading ? data : null,
    executionError: manualError || execError || null,
  };
}
