function normalizeBrowserBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed;
  return `https://${trimmed}`;
}

export function toScenarioEditUrl(
  baseUrl: string,
  teamId: number,
  scenarioId: number,
): string {
  return new URL(
    `/${teamId}/scenarios/${scenarioId}/edit`,
    normalizeBrowserBaseUrl(baseUrl),
  ).toString();
}

export function toScenarioExecutionLogUrl(opts: {
  baseUrl: string;
  teamId: number;
  scenarioId: number;
  executionId: string;
}): string {
  return new URL(
    `/${opts.teamId}/scenarios/${opts.scenarioId}/logs/${opts.executionId}`,
    normalizeBrowserBaseUrl(opts.baseUrl),
  ).toString();
}

export function toWebhookQueueItemUrl(opts: {
  baseUrl: string;
  teamId: number;
  hookId: number;
  itemId: string;
}): string {
  return new URL(
    `/${opts.teamId}/hooks/${opts.hookId}/queue/${opts.itemId}`,
    normalizeBrowserBaseUrl(opts.baseUrl),
  ).toString();
}
