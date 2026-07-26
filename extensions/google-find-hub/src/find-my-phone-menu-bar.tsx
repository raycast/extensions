import { Clipboard, Icon, MenuBarExtra, open, showHUD } from "@raycast/api";

const FIND_HUB_URL = "https://android.com/find";

const GOOGLE_DEVICES_URL = "https://myaccount.google.com/intro/device-activity?hl=en-GB";

const SETUP_GUIDE_URL = "https://support.google.com/android/answer/3265955?hl=en-GB";

const HELP_URL = "https://support.google.com/accounts/answer/6160491?hl=en-GB";

export default function Command() {
  async function copyFindHubLink() {
    await Clipboard.copy(FIND_HUB_URL);
    await showHUD("Find Hub link copied");
  }

  return (
    <MenuBarExtra icon="menu-bar-icon-v1.png" tooltip="Google Find Hub">
      <MenuBarExtra.Section title="Find Hub">
        <MenuBarExtra.Item
          title="Open Find Hub"
          subtitle="Locate, ring, secure or erase a device"
          icon="find-hub.png"
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() => open(FIND_HUB_URL)}
        />

        <MenuBarExtra.Item
          title="Your Google Devices"
          subtitle="Review devices signed into your account"
          icon={Icon.ComputerChip}
          onAction={() => open(GOOGLE_DEVICES_URL)}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Help and Setup">
        <MenuBarExtra.Item
          title="Check Find Hub Setup"
          subtitle="Make sure your device can be found"
          icon={Icon.CheckCircle}
          onAction={() => open(SETUP_GUIDE_URL)}
        />

        <MenuBarExtra.Item
          title="Find Hub Help"
          subtitle="Instructions for lost Android devices"
          icon={Icon.Book}
          onAction={() => open(HELP_URL)}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Copy Find Hub Link" icon={Icon.CopyClipboard} onAction={copyFindHubLink} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
