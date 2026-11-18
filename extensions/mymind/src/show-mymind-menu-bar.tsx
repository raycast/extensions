import { Icon, Image, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand, open } from "@raycast/api";
import { getAccessKeyScope, useWriteAccess } from "./access-control";

async function openCommand(name: "save-to-mymind" | "search-mymind" | "search-spaces") {
  await launchCommand({ name, type: LaunchType.UserInitiated });
}

export default function MymindMenuBarCommand() {
  const { accessKeyId, accessKeySecret, accessLevel } = getPreferenceValues<Preferences>();
  const canWrite = useWriteAccess(accessLevel, getAccessKeyScope(accessKeyId, accessKeySecret));

  return (
    <MenuBarExtra icon={{ source: "mymind-menu-bar.svg" } as Image.ImageLike} tooltip="mymind">
      {canWrite ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item icon={Icon.Plus} title="Save to mymind" onAction={() => openCommand("save-to-mymind")} />
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.MagnifyingGlass}
          title="Search mymind"
          onAction={() => openCommand("search-mymind")}
        />
        <MenuBarExtra.Item icon={Icon.Circle} title="Search Spaces" onAction={() => openCommand("search-spaces")} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Globe} title="Open mymind" onAction={() => open("https://access.mymind.com")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
