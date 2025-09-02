import { INPUT_LIMITS, TIMEOUTS } from "@/constants";
import type { ExecutionConfig } from "./types";

/**
 * Creates standardized execution configuration with safety limits and environment variables.
 */
export function createExecutionConfig(environment: Record<string, string>): ExecutionConfig {
  return {
    timeout: Math.min(TIMEOUTS.DEFAULT_MS, TIMEOUTS.MAX_MS),
    maxInputLength: INPUT_LIMITS.MAX_TEXT_LENGTH,
    environment,
  };
}
