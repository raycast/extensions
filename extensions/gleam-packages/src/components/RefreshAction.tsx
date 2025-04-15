import { Action, Icon, showToast, Toast } from "@raycast/api";

type RefreshPackagesActionProps = {
  refreshPackages: () => void;
};
export default function RefreshPackagesAction({ refreshPackages: reloadPackages }: RefreshPackagesActionProps) {
  return (
    <Action
      title="Refresh Packages"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={() => onRefresh(reloadPackages)}
    />
  );
}

async function onRefresh(refreshPackages: () => void) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Refreshing packages",
  });

  try {
    refreshPackages();
    toast.style = Toast.Style.Success;
    toast.title = "Refreshed packages";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to refresh packages";
    if (err instanceof Error) {
      toast.message = err.message;
    }
  }
}
