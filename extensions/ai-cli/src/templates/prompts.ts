import type { FormValues, PromptBuildParams, PromptTemplate, ToneConfig, ToneType } from "../types";
import { truncateText } from "@/utils/text-processing";
import { messages } from "@/locale/en/messages";
import { CustomTone } from "@/hooks/useCustomTones";
import { CustomTemplate } from "@/hooks/useCustomTemplates";
import { TONE_TYPES } from "@/constants";
import { buildPrompt } from "./prompt-builder";

export const TONES: Record<string, ToneConfig> = {
  [TONE_TYPES.DEFAULT]: {
    name: messages.toneDescriptions.default.name,
    guidelines: messages.toneDescriptions.default.guidelines,
  },
  [TONE_TYPES.PROFESSIONAL]: {
    name: messages.toneDescriptions.professional.name,
    guidelines: messages.toneDescriptions.professional.guidelines,
  },
  [TONE_TYPES.CONVERSATIONAL]: {
    name: messages.toneDescriptions.conversational.name,
    guidelines: messages.toneDescriptions.conversational.guidelines,
  },
  [TONE_TYPES.TECHNICAL]: {
    name: messages.toneDescriptions.technical.name,
    guidelines: messages.toneDescriptions.technical.guidelines,
  },
  [TONE_TYPES.EDUCATIONAL]: {
    name: messages.toneDescriptions.educational.name,
    guidelines: messages.toneDescriptions.educational.guidelines,
  },
  [TONE_TYPES.CONCISE]: {
    name: messages.toneDescriptions.concise.name,
    guidelines: messages.toneDescriptions.concise.guidelines,
  },
};

/**
 * Creates a ToneConfig from tone ID, supporting built-in and custom tones
 */
function resolveToneConfig(toneId: ToneType, customTone?: CustomTone): ToneConfig {
  if (customTone) {
    return {
      name: customTone.name,
      guidelines: customTone.guidelines,
    };
  }

  return TONES[toneId] || TONES[TONE_TYPES.DEFAULT];
}

/**
 * Creates a PromptTemplate from a CustomTemplate
 * Context section is now handled dynamically through form inputs
 */
function createTemplateFromCustomTemplate(customTemplate: CustomTemplate): PromptTemplate {
  return {
    id: customTemplate.id,
    name: customTemplate.name,
    sections: {
      instructions: customTemplate.sections?.instructions || "",
      requirements: customTemplate.sections?.requirements || "",
      output: customTemplate.sections?.output || "",
    },
    icon: customTemplate.icon,
    isBuiltIn: false,
  };
}

export function generateFullPrompt(
  values: FormValues,
  inputText: string,
  maxLength: number,
  getToneById: (id: string) => CustomTone | undefined,
  getTemplateById: (id: string) => CustomTemplate | undefined,
  isFollowUp: boolean = false
): string {
  const processedInput = truncateText(inputText, maxLength);
  const additionalContext = values.additionalContext || "";

  // If not found in built-in templates, check if it's a custom format
  const customTemplate = getTemplateById(values.template);
  if (!customTemplate) {
    throw new Error(`Template with ID "${values.template}" not found`);
  }

  const template: PromptTemplate = createTemplateFromCustomTemplate(customTemplate);

  // Resolve tone configuration
  const customTone = getToneById(values.tone);
  const toneConfig = resolveToneConfig(values.tone, customTone);

  // Build prompt parameters
  const buildParams: PromptBuildParams = {
    isFollowUp,
    text: processedInput,
    tone: {
      name: toneConfig.name,
      guidelines: toneConfig.guidelines,
    },
    context: additionalContext.trim() || undefined,
  };

  // Use the new buildPrompt function
  return buildPrompt(template, buildParams);
}
