import { Action, ActionPanel, getApplications, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getAppIcon } from "../utils/apps";
import { buildFloatingAppItems, FloatingAppOverride } from "../utils/app-state";
import { parseApps, parseRunningApps, getErrorMessage, runFlashspaceAsync } from "../utils/cli";
import { getUndoFloatingAction } from "../utils/floating-apps";
import { FloatingAppAction } from "../utils/types";

export default function FloatingApps() {
  const [overrides, setOverrides] = useState<Record<string, FloatingAppOverride>>({});

  const { isLoading, data, revalidate } = usePromise(
    async () => ({
      floatingApps: parseApps(await runFlashspaceAsync(["list-floating-apps", "--with-bundle-id"])),
      runningApps: parseRunningApps(await runFlashspaceAsync(["list-running-apps", "--with-bundle-id"])),
    }),
    [],
    { failureToastOptions: { title: "Failed to list floating apps" } },
  );

  const { data: installedApps } = usePromise(getApplications);
  const items = useMemo(
    () => buildFloatingAppItems(data?.runningApps || [], data?.floatingApps || [], overrides),
    [data, overrides],
  );

  async function handleFloatingAction(action: FloatingAppAction, name: string, bundleId?: string) {
    const identifier = bundleId || name;
    const toast = await showToast({ style: Toast.Style.Animated, title: `${action}ing app...` });

    try {
      await runFlashspaceAsync(["floating-apps", action, "--name", identifier]);
      toast.style = Toast.Style.Success;
      toast.title = `App ${action}ed successfully`;
      setOverrides((current) => ({
        ...current,
        [identifier]: { app: { name, bundleId }, isFloating: action === "float" },
      }));
      const undoAction = getUndoFloatingAction(action);
      if (undoAction) {
        toast.primaryAction = {
          title: "Undo",
          onAction: async () => {
            try {
              await runFlashspaceAsync(["floating-apps", undoAction, "--name", identifier]);
              setOverrides((current) => ({
                ...current,
                [identifier]: { app: { name, bundleId }, isFloating: undoAction === "float" },
              }));
              revalidate();
            } catch {
              // Undo failed; the list will still reflect the server state after next revalidate
            }
          },
        };
      }
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to ${action} app`;
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search floating apps...">
      {items.map((app) => (
        <List.Item
          key={app.identifier}
          title={app.name}
          subtitle={app.bundleId}
          icon={getAppIcon(installedApps, app)}
          accessories={[{ tag: app.isFloating ? "Floating" : "Unfloated" }]}
          actions={
            <ActionPanel>
              <Action
                title={app.isFloating ? "Unfloat App" : "Float App"}
                icon={app.isFloating ? Icon.XMarkCircle : Icon.PlusCircle}
                onAction={() => handleFloatingAction(app.isFloating ? "unfloat" : "float", app.name, app.bundleId)}
              />
              <Action.CopyToClipboard title="Copy App Name" content={app.name} />
              {app.bundleId && <Action.CopyToClipboard title="Copy Bundle ID" content={app.bundleId} />}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  setOverrides({});
                  revalidate();
                }}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
