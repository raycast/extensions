import { Clipboard, Icon, MenuBarExtra, open, showHUD } from "@raycast/api";

const FIND_HUB_URL = "https://android.com/find";

const GOOGLE_DEVICES_URL = "https://myaccount.google.com/intro/device-activity?hl=en-GB";

const SETUP_GUIDE_URL = "https://support.google.com/android/answer/3265955?hl=en-GB";

const HELP_URL = "https://support.google.com/accounts/answer/6160491?hl=en-GB";

async function openLink(url: string, errorMessage: string) {
  try {
    await open(url);
  } catch (error) {
    console.error(error);
    await showHUD(errorMessage);
  }
}

export default function Command() {
  async function copyFindHubLink() {
    try {
      await Clipboard.copy(FIND_HUB_URL);
      await showHUD("Find Hub link copied");
    } catch (error) {
      console.error(error);
      await showHUD("Could not copy Find Hub link");
    }
  }

  return (
    <MenuBarExtra icon="menu-bar-icon-v1.png" tooltip="Google Find Hub">
      <MenuBarExtra.Section title="Find Hub">
        <MenuBarExtra.Item
          title="Open Find Hub"
          subtitle="Locate, ring, secure or erase a device"
          icon="find-hub.png"
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "f" },
            Windows: { modifiers: ["ctrl"], key: "f" },
          }}
          onAction={() => openLink(FIND_HUB_URL, "Could not open Google Find Hub")}
        />

        <MenuBarExtra.Item
          title="Your Google Devices"
          subtitle="Review devices signed into your account"
          icon={Icon.ComputerChip}
          onAction={() => openLink(GOOGLE_DEVICES_URL, "Could not open Google Devices")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Help and Setup">
        <MenuBarExtra.Item
          title="Check Find Hub Setup"
          subtitle="Make sure your device can be found"
          icon={Icon.CheckCircle}
          onAction={() => openLink(SETUP_GUIDE_URL, "Could not open setup guide")}
        />

        <MenuBarExtra.Item
          title="Find Hub Help"
          subtitle="Instructions for lost Android devices"
          icon={Icon.Book}
          onAction={() => openLink(HELP_URL, "Could not open Find Hub help")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Copy Find Hub Link" icon={Icon.CopyClipboard} onAction={copyFindHubLink} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
