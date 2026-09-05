import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import { useConfig, useViewer } from "../../hooks";
import { orgActive } from "../../lib/config";

/**
 * Picks which of your teams drive the "My team's review" category. Selecting
 * none watches every team you belong to in the active orgs.
 */
export function Teams() {
  const { config, update } = useConfig();
  const { data: viewer, isLoading } = useViewer();

  const teams = (viewer?.teams ?? []).filter((t) => orgActive(config, t.split("/")[0] ?? ""));
  const watched = new Set(config.watchTeams.map((t) => t.toLowerCase()));
  const watchingAll = config.watchTeams.length === 0;

  async function toggle(team: string) {
    const next = watched.has(team.toLowerCase())
      ? config.watchTeams.filter((t) => t.toLowerCase() !== team.toLowerCase())
      : [...config.watchTeams, team];
    await update({ ...config, watchTeams: next });
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Watched Teams"
      searchBarPlaceholder="Filter teams…"
      actions={
        <ActionPanel>
          <Action
            icon={Icon.TwoPeople}
            title="Watch All My Teams"
            onAction={() => update({ ...config, watchTeams: [] })}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.TwoPeople}
        title={isLoading ? "Loading teams…" : "No teams found"}
        description={
          isLoading
            ? undefined
            : "You're not on a team in the selected orgs, or the token lacks read:org. Run `gh auth refresh -s read:org`."
        }
      />
      <List.Section
        title="Teams"
        subtitle={watchingAll ? "Watching all of them" : `${config.watchTeams.length} selected`}
      >
        {teams.map((team) => {
          const isWatched = watchingAll || watched.has(team.toLowerCase());
          return (
            <List.Item
              key={team}
              icon={
                isWatched
                  ? { source: Icon.CheckCircle, tintColor: Color.Orange }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
              }
              title={team}
              accessories={watchingAll ? [{ tag: { value: "default", color: Color.SecondaryText } }] : []}
              actions={
                <ActionPanel>
                  <Action
                    icon={watched.has(team.toLowerCase()) ? Icon.MinusCircle : Icon.PlusCircle}
                    title={watched.has(team.toLowerCase()) ? "Stop Watching" : "Watch Team"}
                    onAction={() => toggle(team)}
                  />
                  <Action
                    icon={Icon.BullsEye}
                    title="Only This Team"
                    onAction={() => update({ ...config, watchTeams: [team] })}
                  />
                  <Action
                    icon={Icon.TwoPeople}
                    title="Watch All My Teams"
                    onAction={() => update({ ...config, watchTeams: [] })}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
