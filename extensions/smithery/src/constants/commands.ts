export const DEFAULT_SMITHERY_EXECUTABLE = "smithery";

function quoteShellPart(value: string): string {
  if (!/[\s'"`$\\]/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function buildCommandPreview(executable: string, args: string[]): string {
  return [executable, ...args].map(quoteShellPart).join(" ");
}

/**
 * Build the display template for an MCP install command (with placeholder client).
 */
export function buildMcpInstallTemplate(
  qualifiedName: string,
  executable = DEFAULT_SMITHERY_EXECUTABLE,
): string {
  return buildCommandPreview(
    executable,
    buildMcpInstallArgs(qualifiedName, "<client>"),
  );
}

/**
 * Build the CLI args array for installing an MCP server with a specific client.
 */
export function buildMcpInstallArgs(
  qualifiedName: string,
  client: string,
): string[] {
  return ["mcp", "add", qualifiedName, "--client", client];
}

export function buildMcpListArgs(client: string): string[] {
  return ["mcp", "list", "--client", client, "--json"];
}

export function buildMcpRemoveArgs(id: string, client: string): string[] {
  return ["mcp", "remove", id, "--client", client];
}

export function buildMcpRemoveCommand(
  id: string,
  client: string,
  executable = DEFAULT_SMITHERY_EXECUTABLE,
): string {
  return buildCommandPreview(executable, buildMcpRemoveArgs(id, client));
}

/**
 * Build the display template for a skill install command (with placeholder agent).
 */
export function buildSkillInstallTemplate(
  skillId: string,
  executable = DEFAULT_SMITHERY_EXECUTABLE,
): string {
  return buildCommandPreview(
    executable,
    buildSkillInstallArgs(skillId, "<agent>"),
  );
}

/**
 * Build the CLI args array for installing a skill with a specific agent.
 */
export function buildSkillInstallArgs(
  skillId: string,
  agent: string,
): string[] {
  return ["skill", "add", skillId, "--agent", agent];
}

export function buildSmitheryVersionArgs(): string[] {
  return ["--version"];
}
