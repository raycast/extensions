import { Icon, Image, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";

async function openCommand(name: "save-to-mymind" | "search-mymind" | "search-spaces") {
  await launchCommand({ name, type: LaunchType.UserInitiated });
}

export default function MymindMenuBarCommand() {
  return (
    <MenuBarExtra icon={{ source: "mymind-menu-bar.svg", mask: Image.Mask.Template }} tooltip="Mymind">
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Plus} title="Save to Mymind" onAction={() => openCommand("save-to-mymind")} />
      </MenuBarExtra.Section>
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
