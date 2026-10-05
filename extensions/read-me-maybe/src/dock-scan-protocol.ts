import type { StoredSource } from "./domain/source-catalog";
import type { DockScan, SourceOutcomes } from "./domain/unread-count";

export function deserializeDockOutcomes(output: string, sources: readonly StoredSource[]): SourceOutcomes | undefined {
  const sourceByDockName = new Map(sources.map((source) => [source.dockName, source.id]));
  const outcomes: SourceOutcomes = {};

  for (const line of output.split("\n")) {
    const [dockName, kind, badge] = line.split("\t");
    const source = sourceByDockName.get(dockName);
    if (!source) {
      continue;
    }
    if (kind === "badge") {
      outcomes[source] = { kind, badge };
    } else if (kind === "notAvailable" || kind === "couldNotReadBadge") {
      outcomes[source] = { kind };
    }
  }

  return sources.every((source) => outcomes[source.id]) ? outcomes : undefined;
}

export function classifyDockError(error: unknown): DockScan {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("not allowed assistive access") || message.includes("-25211")) {
    return { kind: "accessibilityRequired" };
  }
  if (
    message.includes("not permitted to send apple events") ||
    message.includes("not authorized to send apple events") ||
    message.includes("-1743")
  ) {
    return { kind: "automationRequired" };
  }
  return { kind: "failed" };
}
