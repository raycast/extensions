import { ActionPanel, List, Action, popToRoot, Alert, confirmAlert } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getTeams, switchTeam } from "./api/teams";

export default function Command() {
  const { data: teams, isLoading } = useCachedPromise(getTeams, [], { execute: true });

  return (
    <List isLoading={isLoading}>
      {teams &&
        teams.map((team) => (
          <List.Item
            key={team.id}
            title={team.name}
            icon={{ value: "list-icon.png", tooltip: "List Icon" }}
            actions={
              <ActionPanel>
                <Action
                  title="Switch Team"
                  onAction={async () => {
                    await switchTeam(team.id);

                    const options: Alert.Options = {
                      title: "Switched Team",
                      message: "Your data is now being fetched from the new team",

                      primaryAction: {
                        title: "OK",
                        onAction: () => {
                          popToRoot();
                        },
                      },
                    };

                    await confirmAlert(options);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}

      {!teams && <List.EmptyView title="No Teams" description="No teams found" />}
    </List>
  );
}
