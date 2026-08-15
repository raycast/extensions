import { Action, Icon, showToast, Toast } from "@raycast/api";

type HardReloadCacheProps = {
  onReload: () => void;
};

export default function HardReloadCache({ onReload }: HardReloadCacheProps) {
  return (
    <Action
      title="Hard Reload"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      onAction={async () => {
        onReload();
        await showToast({
          style: Toast.Style.Success,
          title: "Cache Cleared",
          message: "Refreshing cached data…",
        });
      }}
    />
  );
}
