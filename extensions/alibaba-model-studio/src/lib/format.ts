import { AI } from "@raycast/api";

/** Human-readable context window size, e.g. "1M tokens" or "205K tokens". */
export function formatContextWindow(tokens: number | undefined): string {
  // RegisteredModel declares the field optional even though toRegisteredModel
  // always sets it — stay defensive rather than cast; a non-finite value
  // would otherwise render as "NaN tokens".
  if (tokens === undefined || tokens === null || !Number.isFinite(tokens)) {
    return "unknown";
  }
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M tokens`;
  }
  if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}K tokens`;
  }
  return `${tokens} tokens`;
}

/**
 * Short capability labels shown next to a model. Tools default to supported,
 * so only an explicit "no tools" is worth surfacing; text, streaming and
 * system messages are universal and left out.
 */
export function capabilityLabels(model: AI.RegisteredModel): string[] {
  const capabilities = model.capabilities;
  if (!capabilities) return [];
  const labels: string[] = [];
  if (capabilities.vision) labels.push("vision");
  if (capabilities.reasoningEffort?.supported) labels.push("reasoning");
  if (capabilities.tools && !capabilities.tools.supported) {
    labels.push("no tools");
  }
  return labels;
}

/** One-line model summary for text surfaces (Check Setup's model block). */
export function formatModelLine(
  model: AI.RegisteredModel,
  options?: { isExtra?: boolean },
): string {
  const capabilities = capabilityLabels(model).join(", ");
  return (
    `${model.title} (${model.id}) — ${formatContextWindow(model.contextWindow)}` +
    `${capabilities ? ` · ${capabilities}` : ""}` +
    `${options?.isExtra ? " · from Extra Models preference" : ""}`
  );
}

/**
 * Base URLs are credential-bearing values (the API key travels as a bearer
 * header, and custom endpoints may embed credentials in userinfo or query).
 * Display copies drop everything but the origin and path so a detail pane
 * can be screenshotted safely. Unparseable input still gets a regex pass —
 * a URL can be malformed (stray space, bad port) and still carry userinfo
 * or a query string worth hiding.
 */
export function redactEndpoint(raw: string): string {
  try {
    const url = new URL(raw);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return raw.replace(/\/\/[^/@\s]*@/, "//redacted@").replace(/[?#].*$/, "");
  }
}
