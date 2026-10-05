/**
 * Documentation section with shortcuts to search commands
 */

import { MenuBarExtra, Icon } from "@raycast/api";
import { handleLaunchCommand } from "../utils/actions";

export function DocumentationSection() {
  return (
    <MenuBarExtra.Section title="Documentation">
      <MenuBarExtra.Item
        title="Search Nuxt Docs"
        icon={Icon.Book}
        onAction={() => handleLaunchCommand("search-nuxt-docs", "Nuxt Docs")}
      />
      <MenuBarExtra.Item
        title="Search Components"
        icon={Icon.Box}
        onAction={() => handleLaunchCommand("search-components", "Components")}
      />
      <MenuBarExtra.Item
        title="Search Modules"
        icon={Icon.Plug}
        onAction={() => handleLaunchCommand("search-modules", "Modules")}
      />
    </MenuBarExtra.Section>
  );
}
