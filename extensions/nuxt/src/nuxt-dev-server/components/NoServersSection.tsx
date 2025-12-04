/**
 * Section displayed when no Nuxt servers are detected
 */

import { MenuBarExtra, Icon } from "@raycast/api";
import { PORT_RANGE } from "../constants/config";

interface NoServersSectionProps {
  onRefresh: () => void;
}

export function NoServersSection({ onRefresh }: NoServersSectionProps) {
  return (
    <>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="No Nuxt servers detected" icon={Icon.ExclamationMark} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={`Start your dev server on ports ${PORT_RANGE.MIN}-${PORT_RANGE.MAX}`} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />
      </MenuBarExtra.Section>
    </>
  );
}
