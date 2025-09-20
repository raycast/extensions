import { getPreferences } from "#/helpers/raycast";
import { withToast } from "#/helpers/toast";
import { Action, Cache, Icon } from "@raycast/api";

export default function ClearCache({ revalidateProjects }: { revalidateProjects: () => void }) {
  const { enableWorktreeCaching } = getPreferences();

  if (!enableWorktreeCaching) return null;

  return (
    <Action
      title="Refresh Cache"
      key="clear-cache"
      icon={Icon.Trash}
      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
      onAction={withToast({
        action: async () => {
          const cache = new Cache();

          cache.clear();
          revalidateProjects();
        },
        onSuccess: () => "Cache cleared",
        onFailure: () => "Failed to clear cache",
      })}
    />
  );
}
