import {
  LaunchProps,
  getPreferenceValues,
  open,
  showHUD,
  showToast,
  Toast,
  openExtensionPreferences,
  closeMainWindow,
  popToRoot,
} from "@raycast/api";

const MAGIC_KEY_REGEX = /^ql_[0-9a-f]{32}$/;

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.QuickOpen }>,
) {
  const { magicKey } = getPreferenceValues<Preferences>();
  const shortcut = props.arguments.shortcut.trim();

  if (!magicKey || !MAGIC_KEY_REGEX.test(magicKey)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid magic key",
      message: "Find your key at Dashboard → Settings → Advanced",
      primaryAction: {
        title: "Open Extension Preferences",
        onAction: () => openExtensionPreferences(),
      },
      secondaryAction: {
        title: "Open QuickLinker Dashboard",
        onAction: () => open("https://quicklinker.app/dashboard/settings"),
      },
    });
    return;
  }

  if (!shortcut) {
    await showHUD("❌ Please enter a shortcut name");
    return;
  }

  const url = `https://quicklinker.app/s/${magicKey}?q=${encodeURIComponent(shortcut)}`;
  await closeMainWindow({ clearRootSearch: true });
  await popToRoot({ clearSearchBar: true });
  await open(url);
  await showHUD(`✅ Opening "${shortcut}"`);
}
