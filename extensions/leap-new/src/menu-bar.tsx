import { MenuBarExtra, open, Icon } from "@raycast/api";

export default function MenuBar() {
  return (
    <MenuBarExtra
      icon={{
        source: {
          light: "logo_menubar_dark.png",
          dark: "logo_menubar_light.png",
        },
      }}
      tooltip="leap.new"
    >
      <MenuBarExtra.Item
        title="Generate App"
        icon={Icon.Rocket}
        onAction={() => open("raycast://extensions/andoutenc/leap-new/generate-app")}
      />
      <MenuBarExtra.Section title="Links">
        <MenuBarExtra.Item title="View Documentation" icon={Icon.Book} onAction={() => open("https://docs.leap.new")} />
        <MenuBarExtra.Item title="Open leap.new" icon={Icon.Globe} onAction={() => open("https://leap.new")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
