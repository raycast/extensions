// New Structured Template System

import type { ToneConfig } from "./index";

// Re-export ToneConfig to fix compilation errors
export type { ToneConfig };

/**
 * New structured template interface supporting clear sections
 * and organized prompt generation
 */
export interface PromptTemplate {
  /** Unique identifier for the template */
  id: string;

  /** Human-readable name for the template */
  name: string;

  /** Optional icon URL for UI display */
  icon?: string;

  /** Whether this is a built-in template (cannot be deleted) */
  isBuiltIn: boolean;

  /** Template sections for structured prompt generation */
  sections: {
    /** Core instructions for the AI */
    instructions: string;

    /** Specific requirements for the task */
    requirements?: string;

    /** Additional context section */
    context?: string;

    /** Output format specifications */
    output?: string;
  };
}

/**
 * Parameters for prompt building
 */
export interface PromptBuildParams {
  /** The original text to be processed */
  text: string;

  /** Tone configuration for styling */
  tone?: ToneConfig;

  /** Additional context for the task */
  context?: string;

  /** Whether this is a follow-up question */
  isFollowUp?: boolean;
}
