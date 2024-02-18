import { MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { useMenuBar } from "./useMenuBar";

export default function Command() {
  const { isLoading, title, moreItems, coinItems } = useMenuBar();
  return (
    <MenuBarExtra isLoading={isLoading} title={title}>
      {coinItems.map((item) => (
        <MenuBarExtra.Item key={item.title} {...item} />
      ))}
      <MenuBarExtra.Section title="Bitcoin">
        {moreItems.map((item) => (
          <MenuBarExtra.Item key={item.title} {...item} />
        ))}
      </MenuBarExtra.Section>
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
