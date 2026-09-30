import { CoverMenubarItem } from "@components/cover/menu";
import { useHAStates } from "@components/hooks";
import { LaunchCommandMenubarItem } from "@components/menu";
import { filterViaPreferencePatterns } from "@components/state/utils";
import { getErrorMessage, getFriendlyName } from "@lib/utils";
import { MenuBarExtra as RUIMenuBarExtra } from "@raycast-community/ui";
import { Color, Icon, LaunchType, MenuBarExtra } from "@raycast/api";

export default function CoversMenuCommand() {
  const { states, error, isLoading } = useHAStates();
  const entities = filterViaPreferencePatterns(states, ["cover.*"])?.sort((a, b) =>
    getFriendlyName(a).localeCompare(getFriendlyName(b)),
  );
  const header = error ? getErrorMessage(error) : undefined;

  const coversOpenCount = entities?.filter((e) => e.state === "open").length || 0;
  const coversClosedCount = entities?.filter((e) => e.state === "closed").length || 0;
  const icon = coversOpenCount && coversOpenCount > 0 ? "window-open.svg" : "window-closed.svg";

  return (
    <MenuBarExtra
      icon={{ source: icon, tintColor: Color.PrimaryText }}
      isLoading={isLoading}
      tooltip={`Home Assistant Covers: Open ${coversOpenCount}, Closed ${coversClosedCount}`}
    >
      {header && <MenuBarExtra.Item title={header} />}
      <LaunchCommandMenubarItem
        title="Open All Covers Command"
        command={{
          name: "covers",
          type: LaunchType.UserInitiated,
        }}
        icon={Icon.Terminal}
      />
      <MenuBarExtra.Section title="Covers">
        {entities?.map((e) => (
          <CoverMenubarItem key={e.entity_id} state={e} />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <RUIMenuBarExtra.ConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
