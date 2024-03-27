import { MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { useMenuBar } from "./useMenuBar";

export default function Command() {
  const { isLoading, title, items, sections } = useMenuBar();
  return (
    <MenuBarExtra isLoading={isLoading} title={title}>
      {items.map((item) => (
        <MenuBarExtra.Item key={item} title={item} onAction={() => null} />
      ))}
      {sections.map((section) => (
        <MenuBarExtra.Section key={section.title} title={section.title}>
          {section.items.map((item) => (
            <MenuBarExtra.Item key={item} title={item} onAction={() => null} />
          ))}
        </MenuBarExtra.Section>
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Settings"
          onAction={openCommandPreferences}
          shortcut={{ key: ",", modifiers: ["cmd"] }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
