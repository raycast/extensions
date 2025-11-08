import { VALIDATION, ERROR_MESSAGES } from "../../core/constants";
import { PresetConfig } from "../../core/types";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validatePrompt(prompt: string): ValidationResult {
  // Check if prompt is empty
  if (!prompt || prompt.trim().length === 0) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.CLIPBOARD_EMPTY,
    };
  }

  const trimmedPrompt = prompt.trim();

  // Check minimum length
  if (trimmedPrompt.length < VALIDATION.MIN_PROMPT_LENGTH) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.PROMPT_TOO_SHORT,
    };
  }

  // Check maximum length
  if (trimmedPrompt.length > VALIDATION.MAX_PROMPT_LENGTH) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.PROMPT_TOO_LONG,
    };
  }

  return { isValid: true };
}

export function validateModelName(modelName: string): ValidationResult {
  if (!modelName || modelName.trim().length === 0) {
    return {
      isValid: false,
      error: "Model name is required",
    };
  }

  // Basic model name validation (alphanumeric, dots, colons, hyphens)
  const modelNameRegex = /^[a-zA-Z0-9.:_-]+$/;
  if (!modelNameRegex.test(modelName)) {
    return {
      isValid: false,
      error: "Invalid model name format",
    };
  }

  return { isValid: true };
}

export function validateUrl(url: string): ValidationResult {
  if (!url || url.trim().length === 0) {
    return {
      isValid: false,
      error: "URL is required",
    };
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: "Invalid URL format",
    };
  }
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\r/g, "\n") // Convert CR to LF
    .replace(/\n{3,}/g, "\n\n"); // Limit consecutive newlines
}

export function validatePresetId(presetId: string): ValidationResult {
  if (!presetId || presetId.trim().length === 0) {
    return {
      isValid: false,
      error: "Preset ID is required",
    };
  }

  // Preset ID should be alphanumeric with hyphens/underscores
  const presetIdRegex = /^[a-zA-Z0-9\-_]+$/;
  if (!presetIdRegex.test(presetId)) {
    return {
      isValid: false,
      error: "Invalid preset ID format",
    };
  }

  return { isValid: true };
}

export function validatePresetConfig(preset: Partial<PresetConfig>): ValidationResult {
  // Check required fields
  if (!preset.name || preset.name.trim().length === 0) {
    return {
      isValid: false,
      error: "Preset name is required",
    };
  }

  if (!preset.systemPrompt || preset.systemPrompt.trim().length === 0) {
    return {
      isValid: false,
      error: "System prompt is required",
    };
  }

  // Validate name length
  if (preset.name.trim().length > VALIDATION.MAX_PRESET_NAME_LENGTH) {
    return {
      isValid: false,
      error: `Preset name must be ${VALIDATION.MAX_PRESET_NAME_LENGTH} characters or less`,
    };
  }

  // Validate system prompt length
  if (preset.systemPrompt.trim().length > VALIDATION.MAX_PROMPT_LENGTH) {
    return {
      isValid: false,
      error: `System prompt must be ${VALIDATION.MAX_PROMPT_LENGTH} characters or less`,
    };
  }

  // Validate description length if provided
  if (preset.description && preset.description.length > VALIDATION.MAX_PRESET_DESCRIPTION_LENGTH) {
    return {
      isValid: false,
      error: `Description must be ${VALIDATION.MAX_PRESET_DESCRIPTION_LENGTH} characters or less`,
    };
  }

  // Validate tags if provided
  if (preset.tags && preset.tags.length > VALIDATION.MAX_PRESET_TAGS) {
    return {
      isValid: false,
      error: `Maximum ${VALIDATION.MAX_PRESET_TAGS} tags allowed`,
    };
  }

  // Validate each tag length
  if (preset.tags) {
    for (const tag of preset.tags) {
      if (tag.length > VALIDATION.MAX_TAG_LENGTH) {
        return {
          isValid: false,
          error: `Tag "${tag}" is too long (max ${VALIDATION.MAX_TAG_LENGTH} characters)`,
        };
      }
    }
  }

  return { isValid: true };
}
