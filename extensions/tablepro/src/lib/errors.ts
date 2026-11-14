import {
  ExternalAccessDeniedError,
  InvalidPortError,
  MCPNotRunningError,
  RateLimitedError,
  ServerDisabledError,
  ServerUnreachableError,
  TableProNotInstalledError,
  TokenExpiredError,
  TokenMissingError,
  TokenRevokedError,
  UpdateRequiredError,
} from "./types";
import { translateError } from "./protocol";

export type ErrorScenario =
  | { kind: "not-installed" }
  | { kind: "update-required"; minimum: string; installed?: string }
  | { kind: "mcp-not-running" }
  | { kind: "unreachable"; port: number }
  | { kind: "invalid-port"; value: string }
  | { kind: "no-token" }
  | { kind: "token-revoked" }
  | { kind: "token-expired" }
  | { kind: "server-disabled" }
  | { kind: "rate-limited" }
  | { kind: "access-denied"; message: string }
  | { kind: "other"; message: string };

export function classifyError(error: unknown): ErrorScenario {
  const err = translateError(error);
  if (err instanceof TableProNotInstalledError)
    return { kind: "not-installed" };
  if (err instanceof UpdateRequiredError) {
    return {
      kind: "update-required",
      minimum: err.minimumVersion,
      installed: err.installedVersion,
    };
  }
  if (err instanceof MCPNotRunningError) return { kind: "mcp-not-running" };
  if (err instanceof ServerUnreachableError) {
    return { kind: "unreachable", port: err.port };
  }
  if (err instanceof InvalidPortError) {
    return { kind: "invalid-port", value: err.value };
  }
  if (err instanceof TokenMissingError) return { kind: "no-token" };
  if (err instanceof TokenRevokedError) return { kind: "token-revoked" };
  if (err instanceof TokenExpiredError) return { kind: "token-expired" };
  if (err instanceof ServerDisabledError) return { kind: "server-disabled" };
  if (err instanceof RateLimitedError) return { kind: "rate-limited" };
  if (err instanceof ExternalAccessDeniedError) {
    return { kind: "access-denied", message: err.message };
  }
  return { kind: "other", message: err.message };
}

export function describeScenario(scenario: ErrorScenario): {
  title: string;
  description: string;
} {
  switch (scenario.kind) {
    case "not-installed":
      return {
        title: "TablePro is not installed",
        description:
          "Install TablePro from tablepro.app to use this extension.",
      };
    case "update-required":
      return {
        title: "Update TablePro",
        description: scenario.installed
          ? `This extension needs TablePro ${scenario.minimum} or later. You have ${scenario.installed}.`
          : `This extension needs TablePro ${scenario.minimum} or later.`,
      };
    case "mcp-not-running":
      return {
        title: "TablePro is not running",
        description:
          "Open TablePro and try again. The local MCP server starts on demand.",
      };
    case "unreachable":
      return {
        title: `No answer on port ${scenario.port}`,
        description:
          "TablePro's MCP server is not on this port. Set MCP Port in the extension preferences to the port TablePro shows in its settings.",
      };
    case "invalid-port":
      return {
        title: "MCP Port is not valid",
        description: `"${scenario.value}" is not a port. Set MCP Port in the extension preferences to a number from 1 to 65535.`,
      };
    case "no-token":
      return {
        title: "Pair with TablePro",
        description:
          "Run the Pair with TablePro command to issue an API token.",
      };
    case "token-revoked":
      return {
        title: "API token was revoked",
        description: "Run Pair with TablePro again to issue a new token.",
      };
    case "token-expired":
      return {
        title: "API token expired",
        description: "Run Pair with TablePro again to issue a new token.",
      };
    case "server-disabled":
      return {
        title: "MCP server is off",
        description: "Turn on the MCP server in TablePro's settings.",
      };
    case "rate-limited":
      return {
        title: "Too many requests",
        description:
          "TablePro is limiting requests from this Mac. Wait a few minutes and try again.",
      };
    case "access-denied":
      return { title: "Access denied", description: scenario.message };
    case "other":
      return { title: "TablePro error", description: scenario.message };
  }
}
