import type { Interaction } from "./protocol.js";

// Fence length exceeds every backtick run, keeping Agent content literal and inert.
function literal(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const fence = "`".repeat(
    Array.from(text.matchAll(/`+/g)).reduce((length, match) => Math.max(length, match[0].length + 1), 3),
  );
  return `${fence}\n${text}\n${fence}`;
}
function parsed(detail: string): unknown {
  try {
    return JSON.parse(detail);
  } catch {
    return detail;
  }
}
export function originalParametersMarkdown(request: Interaction): string {
  return `# Original Parameters\n\nComplete request details, read-only.\n\n${literal(request.detail)}`;
}
export function interactionMarkdown(request: Interaction): string {
  try {
    const value = parsed(request.detail);
    if (!request.requestId.startsWith("codex:") || !value || typeof value !== "object" || Array.isArray(value))
      return literal(value);
    const remaining: Record<string, unknown> = { ...value };
    const sections: string[] = [];
    const field = (key: string, title: string) => {
      if (!Object.hasOwn(remaining, key)) return;
      sections.push(`## ${title}\n\n${literal(remaining[key])}`);
      delete remaining[key];
    };
    field("command", "Command");
    field("cwd", "Working Directory");
    field("reason", "Reason");
    field("kind", "Operation");
    field("changes", "File Changes");
    if (remaining.grantRoot)
      sections.push("**Session-wide file grant requested. Review this in the original Codex terminal.**");
    field("grantRoot", "File Grant Scope");
    const permissions = remaining.permissions;
    if (permissions && typeof permissions === "object" && !Array.isArray(permissions)) {
      const extra: Record<string, unknown> = { ...permissions };
      if (Object.hasOwn(extra, "network")) {
        const network = extra.network;
        sections.push(`## Network\n\n${literal(network)}`);
        delete extra.network;
      }
      if (Object.hasOwn(extra, "fileSystem")) {
        const fs = extra.fileSystem;
        if (fs && typeof fs === "object" && !Array.isArray(fs)) {
          const rules: Record<string, unknown> = { ...fs };
          sections.push("## File System");
          for (const [key, title] of [
            ["read", "Read Access"],
            ["write", "Write Access"],
            ["entries", "Path Rules"],
            ["globScanMaxDepth", "Glob Scan Depth"],
          ] as const) {
            if (!Object.hasOwn(rules, key)) continue;
            sections.push(`### ${title}\n\n${literal(rules[key])}`);
            delete rules[key];
          }
          if (Object.keys(rules).length) sections.push(literal(rules));
        } else sections.push(`## File System\n\n${literal(fs)}`);
        delete extra.fileSystem;
      }
      if (Object.keys(extra).length) sections.push(`## Additional Permissions\n\n${literal(extra)}`);
      delete remaining.permissions;
    }
    // Opaque correlation IDs remain accessible in the separate complete original view.
    for (const key of ["threadId", "turnId", "itemId"]) delete remaining[key];
    if (Object.keys(remaining).length) sections.push(`## Additional Parameters\n\n${literal(remaining)}`);
    return sections.length ? sections.join("\n\n") : literal(value);
  } catch {
    // Deep JSON can parse successfully but exceed the serializer stack.
    return literal(request.detail);
  }
}
