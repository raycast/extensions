import { useCachedState } from "@raycast/utils";
import { ExtensionPreferences, TemplateType, ToneType } from "../types";
import { getSafeValue } from "@/utils/validation";
import { TEMPLATE_TYPES, TONE_TYPES } from "@/constants";
import { useAgentConfig } from "./useAgentConfig";
import { getAgent } from "@/agents";

const EXTENSION_PREFIX = "devprompt";

export function useFormPersistence({ preferences }: { preferences: ExtensionPreferences }) {
  const { config: agentConfig } = useAgentConfig(preferences);

  // Agent selection persistence
  const [lastAgent, setLastAgent] = useCachedState<string>(`${EXTENSION_PREFIX}-last-agent`, "claude", {
    cacheNamespace: EXTENSION_PREFIX,
  });

  // Persistent settings with constant fallbacks
  const [lastTemplate, setLastTemplate] = useCachedState<TemplateType>(
    `${EXTENSION_PREFIX}-last-template`,
    TEMPLATE_TYPES.CUSTOM as TemplateType,
    { cacheNamespace: EXTENSION_PREFIX }
  );

  const [lastTone, setLastTone] = useCachedState<ToneType>(
    `${EXTENSION_PREFIX}-last-tone`,
    TONE_TYPES.DEFAULT as ToneType,
    {
      cacheNamespace: EXTENSION_PREFIX,
    }
  );

  // Model persistence now per-agent
  const [lastModel, setLastModel] = useCachedState<string>(`${EXTENSION_PREFIX}-last-model-${lastAgent}`, "", {
    cacheNamespace: EXTENSION_PREFIX,
  });

  const [lastTargetFolder, setLastTargetFolder] = useCachedState<string>(
    `${EXTENSION_PREFIX}-last-target-folder`,
    agentConfig.workingDir,
    {
      cacheNamespace: EXTENSION_PREFIX,
    }
  );

  // Get default model for selected agent
  const agent = getAgent(lastAgent);
  const defaultModel = Object.values(agent.models)[0]?.displayName || "";
  const initialModel = lastModel || defaultModel;

  const initialAgent = getSafeValue(lastAgent, "claude") as string;
  const initialTemplate = getSafeValue(lastTemplate, TEMPLATE_TYPES.CUSTOM) as TemplateType;
  const initialTone = getSafeValue(lastTone, TONE_TYPES.DEFAULT) as ToneType;
  const initialTargetFolder = getSafeValue(lastTargetFolder, "") as string;

  return {
    // Initial values for form initialization
    initialAgent,
    initialTemplate,
    initialTone,
    initialModel,
    initialTargetFolder,
    // Current values for testing and state tracking
    lastAgent,
    lastTemplate,
    lastTone,
    lastModel,
    lastTargetFolder,
    // Setters for persistence
    setLastAgent,
    setLastTemplate,
    setLastTone,
    setLastModel,
    setLastTargetFolder,
  };
}
