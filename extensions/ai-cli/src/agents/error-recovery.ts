import type { CategorizedError } from "../types";
import { AUTH_COMMANDS } from "@/constants";

/**
 * Maps error categories to appropriate recovery action identifiers.
 */
export const RECOVERY_ACTION_MAP: Record<CategorizedError["category"], string[]> = {
  timeout: ["increase_timeout", "reduce_input_length", "check_connection", "retry_request"],
  not_found: ["check_agent_path", "verify_installation", "check_permissions"],
  permission: ["fix_permissions", "change_directory", "check_access"],
  authentication: Object.values(AUTH_COMMANDS),
  parsing: ["retry_request", "reduce_variants", "check_input_format"],
  unknown: ["retry_request", "check_configuration", "contact_support"],
  network: ["check_network", "retry_request", "check_proxy_settings"],
  configuration: ["check_configuration", "verify_settings", "contact_support"],
};

/**
 * Returns recovery actions for error category, falling back to unknown error actions.
 */
export function getRecoveryActions(error: CategorizedError): string[] {
  return RECOVERY_ACTION_MAP[error.category] || RECOVERY_ACTION_MAP.unknown;
}
