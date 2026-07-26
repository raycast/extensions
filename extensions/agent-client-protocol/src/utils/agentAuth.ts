/**
 * Agent Authentication Helpers
 *
 * ACP agents that need a login advertise `authMethods` during `initialize` and
 * reject prompts with `-32000 Authentication required` until one has been used.
 *
 * Methods of type `terminal` are not completed over the protocol: the agent expects
 * the *client* to run the agent binary with the method's arguments in a real terminal,
 * so the user can go through an interactive login. This module builds that command
 * and hands it to the user.
 */

import { spawn } from "child_process";
import { writeFile, chmod } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { AuthMethod } from "@agentclientprotocol/sdk";
import type { AgentConfig } from "@/types/extension";
import { createLogger } from "./logging";

const logger = createLogger("AgentAuth");

/** An auth method the client completes by running the agent binary itself */
export type TerminalAuthMethod = Extract<AuthMethod, { type: "terminal" }>;

export interface TerminalAuthCommand {
  /** Label of the auth method, for display */
  label: string;
  /** Shell command the user has to run */
  shellCommand: string;
}

export function isTerminalAuthMethod(method: AuthMethod): method is TerminalAuthMethod {
  return (method as { type?: string }).type === "terminal";
}

/**
 * Pick the auth method to offer the user: the first terminal method, if any.
 */
export function findTerminalAuthMethod(methods: AuthMethod[]): TerminalAuthMethod | null {
  return methods.find(isTerminalAuthMethod) ?? null;
}

function quoteArgument(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * Build the login command for a terminal auth method.
 *
 * Returns `null` for agents configured without a command (remote agents), which
 * cannot be logged in this way.
 */
export function buildTerminalAuthCommand(config: AgentConfig, method: TerminalAuthMethod): TerminalAuthCommand | null {
  if (!config.command) {
    return null;
  }

  const parts: string[] = [];

  // The agent binary may live outside the login shell's PATH — the same directories
  // the extension appends when spawning it have to be available here too.
  if (config.appendToPath?.length) {
    const extraPath = config.appendToPath.filter(Boolean).map(quoteArgument).join(":");
    if (extraPath) {
      parts.push(`export PATH="$PATH:${extraPath}"`);
    }
  }

  for (const [key, value] of Object.entries(method.env ?? {})) {
    parts.push(`export ${key}=${quoteArgument(value)}`);
  }

  const invocation = [config.command, ...(method.args ?? [])].map(quoteArgument).join(" ");
  parts.push(invocation);

  return {
    label: method.name || method.id,
    shellCommand: parts.join("\n"),
  };
}

/**
 * Open the login command in Terminal.app.
 *
 * The command is written to a temporary script instead of being passed to
 * `osascript`, which would mean quoting a shell command inside an AppleScript
 * string inside another shell command.
 *
 * Returns `false` on platforms where we cannot open a terminal; callers should
 * fall back to showing the command.
 */
export async function openTerminalAuth(command: TerminalAuthCommand): Promise<boolean> {
  if (process.platform !== "darwin") {
    return false;
  }

  try {
    const scriptPath = join(tmpdir(), `acp-login-${Date.now()}.command`);
    const script = ["#!/bin/sh", "", command.shellCommand, ""].join("\n");

    await writeFile(scriptPath, script, "utf8");
    await chmod(scriptPath, 0o755);

    const child = spawn("open", ["-a", "Terminal", scriptPath], { stdio: "ignore", detached: true });
    child.unref();

    logger.info("Opened agent login in Terminal", { label: command.label, scriptPath });
    return true;
  } catch (error) {
    logger.error("Failed to open agent login in Terminal", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
