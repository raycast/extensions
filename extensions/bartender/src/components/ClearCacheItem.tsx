import { Action, Icon } from "@raycast/api";

export function ClearCacheItem({ clearCache }: { clearCache: () => void }) {
  return <Action title="Clear Menu Bar Details Cache" icon={Icon.Trash} onAction={clearCache} />;
}
