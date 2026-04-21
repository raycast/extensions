import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import PriceSchedule from "./components/PriceSchedule";

export default function Command() {
  const { favoriteEvseId } = getPreferenceValues<{ favoriteEvseId?: string }>();
  const evseId = favoriteEvseId?.trim();

  if (!evseId) {
    return (
      <Detail
        markdown={`# No chargepoint saved\n\nSet your Chargepoint ID in extension preferences to use this command.`}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  return <PriceSchedule evseId={evseId} />;
}
