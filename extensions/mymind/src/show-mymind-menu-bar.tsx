import { Icon, Image, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand, open } from "@raycast/api";
import { useWriteAccess } from "./access-control";

async function openCommand(name: "save-to-mymind" | "search-mymind" | "search-spaces") {
  await launchCommand({ name, type: LaunchType.UserInitiated });
}

export default function MymindMenuBarCommand() {
  const { accessKeyId, accessKeySecret, accessLevel } = getPreferenceValues<Preferences>();
  const canWrite = useWriteAccess(accessLevel, `${accessKeyId}:${accessKeySecret}`);

  return (
    <MenuBarExtra icon={{ source: "mymind-menu-bar.svg" } as Image.ImageLike} tooltip="Mymind">
      {canWrite ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item icon={Icon.Plus} title="Save to Mymind" onAction={() => openCommand("save-to-mymind")} />
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.MagnifyingGlass}
          title="Search Mymind"
          onAction={() => openCommand("search-mymind")}
        />
        <MenuBarExtra.Item icon={Icon.Circle} title="Search Spaces" onAction={() => openCommand("search-spaces")} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Globe} title="Open Mymind" onAction={() => open("https://access.mymind.com")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
