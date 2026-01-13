import { Action } from "@raycast/api";

export function ModelDetailsLinkAction({ modelId }: { modelId: string }) {
  return <Action.OpenInBrowser title="Show in Browser" url={`https://llm-stats.com/models/${modelId}`} />;
}
