import { Action, Icon, Keyboard } from "@raycast/api";

/**
 * Shows/hides the list's detail sidebar.
 *
 * Labelled "Sidebar" rather than "Details" so it reads distinctly from the
 * "View Post" action, which pushes a full-screen render of the post. `Common`'s
 * ⌘Y (`ToggleQuickLook`) is the platform-aware preview-toggle binding.
 */
export default function ToggleDetailAction({
  isShowingDetail,
  setIsShowingDetail,
}: {
  isShowingDetail: boolean;
  setIsShowingDetail: (value: boolean) => void;
}) {
  return (
    <Action
      title={isShowingDetail ? "Hide Sidebar" : "Show Sidebar"}
      icon={Icon.Sidebar}
      shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
      onAction={() => setIsShowingDetail(!isShowingDetail)}
    />
  );
}
