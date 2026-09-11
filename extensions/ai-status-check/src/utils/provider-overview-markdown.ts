import { componentStatusPresentation, providerStatusPresentation } from "../domain/status-presentation";
import type { ProviderStatusRecord } from "../domain/types";
import { escapeMarkdown } from "./markdown";

export function buildProviderOverviewMarkdown(record: ProviderStatusRecord): string | undefined {
  const snapshot = record.snapshot;
  if (!snapshot) return undefined;

  const lines = [`### ${escapeMarkdown(providerStatusPresentation(snapshot).label)}`];
  if (record.refreshError) {
    lines.push("", `> Refresh failed: ${escapeMarkdown(record.refreshError)}. Showing the last retrieved status.`);
  } else if (record.freshness !== "fresh") {
    lines.push("", "> Showing saved status. Refresh to retrieve the latest report.");
  }

  const components = snapshot.components
    .map((component) => ({ name: component.name, ...componentStatusPresentation(component) }))
    .filter(({ health }) => health !== "operational");
  if (components.length > 0) {
    const heading = components.some(({ health }) => health === "unknown") ? "Component Status" : "Affected Components";
    lines.push("", heading, "");
    for (const component of components) {
      lines.push(`- ${escapeMarkdown(component.name)} — ${escapeMarkdown(component.label)}`);
    }
  } else {
    lines.push(
      "",
      snapshot.components.length > 0
        ? "No component issues reported."
        : "Component data is unavailable. Check the official status page for more details.",
    );
  }
  return lines.join("\n");
}
