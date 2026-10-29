import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Instance, tokenForInstance } from "./instances";
import { DockerDiskUsageItem, ErrorResult } from "./interfaces";

interface CleanupAction {
  key: string;
  title: string;
  route: string;
  /** Matches `docker system df`'s own `Type` column, for the accessory below - `null` for an
   * action that spans more than one type (Full Docker Prune). */
  usageType: string | null;
  confirmMessage: string;
}

const CLEANUP_ACTIONS: CleanupAction[] = [
  {
    key: "containers",
    title: "Clean Stopped Containers",
    route: "settings.cleanStoppedContainers",
    usageType: "Containers",
    confirmMessage: "Removes every stopped container. Running containers aren't touched.",
  },
  {
    key: "images",
    title: "Clean Unused Images",
    route: "settings.cleanUnusedImages",
    usageType: "Images",
    confirmMessage:
      "Removes every image not currently used by a container. Re-downloaded automatically the next time a deploy needs it.",
  },
  {
    key: "volumes",
    title: "Clean Unused Volumes",
    route: "settings.cleanUnusedVolumes",
    usageType: "Local Volumes",
    confirmMessage:
      "Removes every volume not currently attached to a running container, including named volumes holding real data. Dokploy itself treats this as a manual-only action for that reason - a stopped-but-not-removed container's volumes can still look unused. Double-check before running this.",
  },
  {
    key: "builder",
    title: "Clean Build Cache",
    route: "settings.cleanDockerBuilder",
    usageType: "Build Cache",
    confirmMessage:
      "Clears the Docker builder cache. The next build for every app starts from scratch - slower, nothing is lost.",
  },
  {
    key: "prune",
    title: "Full Docker Prune",
    route: "settings.cleanDockerPrune",
    usageType: null,
    confirmMessage:
      "Removes stopped containers, unused images, and the build cache in one pass. Volumes are never touched by this action.",
  },
];

/**
 * Docker-level cleanup for the instance's own Dokploy host - no `serverId`, matching how
 * `docker.tsx` itself only ever shows this host's own containers, not a remote server's.
 *
 * `settings.clean*` requires an org-admin API key server-side (`adminProcedure`) - a non-admin
 * key just surfaces as a normal failed-mutation toast here, same as any other rejected request.
 */
export default function DockerCleanup({ instance }: { instance: Instance }) {
  const { url, headers } = tokenForInstance(instance);

  const {
    isLoading,
    data: usage,
    error,
    revalidate,
  } = useFetch<DockerDiskUsageItem[], DockerDiskUsageItem[]>(url + "dockerDiskUsage.getDiskUsage", {
    headers,
    initialData: [],
  });

  async function runCleanup(action: CleanupAction) {
    const options: Alert.Options = {
      title: `${action.title}?`,
      message: action.confirmMessage,
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: action.title,
      },
    };
    if (!(await confirmAlert(options))) return;

    const toast = await showToast(Toast.Style.Animated, `${action.title}…`);
    try {
      const response = await fetch(url + action.route, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const err = (await response.json()) as ErrorResult;
        throw new Error(err.message);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Cleanup complete";
      toast.message = action.title;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not run "${action.title}"`;
      toast.message = `${error}`;
    }
  }

  return (
    <List navigationTitle={`Docker Cleanup - ${instance.name}`} isLoading={isLoading}>
      {error && (
        <List.Item
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Could Not Load Disk Usage"
          subtitle={`${error}`}
        />
      )}
      {CLEANUP_ACTIONS.map((action) => {
        const usageItem = usage.find((item) => item.type === action.usageType);
        return (
          <List.Item
            key={action.key}
            icon={Icon.Trash}
            title={action.title}
            subtitle={usageItem ? `${usageItem.size} used, ${usageItem.reclaimable} reclaimable` : undefined}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Trash}
                  title={action.title}
                  style={Action.Style.Destructive}
                  onAction={() => runCleanup(action)}
                />
                <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
