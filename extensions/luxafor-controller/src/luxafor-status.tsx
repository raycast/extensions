import { MenuBarExtra, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { BASE_COLOURS, stateSummary, attemptSummary, colourLabel } from "./luxafor-state";
import { useController } from "./use-controller";

export default function LuxaforStatus() {
  const { state, loading, notice, refresh, send } = useController();
  const { menubarMode } = getPreferenceValues<Preferences>();
  const colours = menubarMode === "full" ? Object.keys(BASE_COLOURS) : ["red", "green"];
  return (
    <MenuBarExtra
      icon={Icon.LightBulb}
      title="Luxafor"
      tooltip={`${stateSummary(state)}; physical state unknown`}
      isLoading={loading}
    >
      <MenuBarExtra.Section title="Request History">
        <MenuBarExtra.Item title={stateSummary(state)} />
        <MenuBarExtra.Item title={notice ?? attemptSummary(state)} />
        <MenuBarExtra.Item title="Refresh History" icon={Icon.ArrowClockwise} onAction={refresh} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Change Light">
        {colours.map((colour) => (
          <MenuBarExtra.Item
            key={colour}
            title={
              colour === "red"
                ? "Set Busy (Red)"
                : colour === "green"
                  ? "Set Available (Green)"
                  : `Set ${colourLabel(colour)}`
            }
            icon={Icon.Circle}
            onAction={() => send({ kind: "solid", colour })}
          />
        ))}
        <MenuBarExtra.Item title="Turn Off" icon={Icon.Power} onAction={() => send({ kind: "solid", colour: "off" })} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Item title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </MenuBarExtra>
  );
}
