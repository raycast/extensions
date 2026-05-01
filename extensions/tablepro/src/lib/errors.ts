import {
  ExternalAccessDeniedError,
  MCPNotRunningError,
  TableProNotInstalledError,
  TokenMissingError,
  TokenRevokedError,
} from "./types";

export type ErrorScenario =
  | { kind: "not-installed" }
  | { kind: "mcp-not-running" }
  | { kind: "no-token" }
  | { kind: "token-revoked" }
  | { kind: "access-denied"; message: string }
  | { kind: "other"; message: string };

export function classifyError(error: unknown): ErrorScenario {
  if (error instanceof TableProNotInstalledError) {
    return { kind: "not-installed" };
  }
  if (error instanceof MCPNotRunningError) {
    return { kind: "mcp-not-running" };
  }
  if (error instanceof TokenMissingError) {
    return { kind: "no-token" };
  }
  if (error instanceof TokenRevokedError) {
    return { kind: "token-revoked" };
  }
  if (error instanceof ExternalAccessDeniedError) {
    return { kind: "access-denied", message: error.message };
  }
  if (error instanceof Error) {
    return { kind: "other", message: error.message };
  }
  return { kind: "other", message: String(error) };
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
    case "mcp-not-running":
      return {
        title: "TablePro is not running",
        description:
          "Open TablePro and try again. The local MCP server starts on demand.",
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
    case "access-denied":
      return { title: "Access denied", description: scenario.message };
    case "other":
      return { title: "TablePro error", description: scenario.message };
  }
}
