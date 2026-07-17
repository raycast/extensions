import { EntityStandardActionSections } from "@components/entity";
import { UpdateInstallAction, UpdateSkipVersionAction } from "@components/update/actions";
import { State } from "@lib/haapi";
import { ActionPanel } from "@raycast/api";
import { ShowWeatherAction } from "./list";

export function WeatherActionPanel({ state }: { state: State }) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <ShowWeatherAction state={state} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Install">
        <UpdateInstallAction state={state} />
        <UpdateSkipVersionAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
