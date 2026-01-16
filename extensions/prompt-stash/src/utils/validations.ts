/**
 * Configuration limits for form validations
 */
export const VALIDATION_LIMITS = {
  title: {
    min: 3,
    max: 100,
  },
  content: {
    min: 10,
    max: 18000,
  },
  tags: {
    max: 10,
  },
} as const;

/**
 * Validations for prompt forms
 * Returns error string or undefined if valid
 */
export const promptValidations = {
  title: (value?: string): string | undefined => {
    if (!value) {
      return "Title is required";
    }
    if (value.length < VALIDATION_LIMITS.title.min) {
      return `Title must be at least ${VALIDATION_LIMITS.title.min} characters`;
    }
    if (value.length > VALIDATION_LIMITS.title.max) {
      return `Title must be at most ${VALIDATION_LIMITS.title.max} characters`;
    }
    return undefined;
  },
  content: (value?: string): string | undefined => {
    if (!value) {
      return "Prompt content is required";
    }
    if (value.length < VALIDATION_LIMITS.content.min) {
      return `Prompt content must be at least ${VALIDATION_LIMITS.content.min} characters`;
    }
    if (value.length > VALIDATION_LIMITS.content.max) {
      return `Prompt content must be at most ${VALIDATION_LIMITS.content.max} characters`;
    }
    return undefined;
  },
  tags: (value?: string[]): string | undefined => {
    if (value && value.length > VALIDATION_LIMITS.tags.max) {
      return `Maximum ${VALIDATION_LIMITS.tags.max} tags allowed`;
    }
    return undefined;
  },
} as const;
