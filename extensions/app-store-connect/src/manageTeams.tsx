import { List, ActionPanel, Action, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { useTeams, Team } from "./Model/useTeams";
import { isSameCredential } from "./Utils/credentials";
import { useEffect, useState } from "react";
import { confirmAlert, Alert } from "@raycast/api";
import AddTeam from "./Components/AddTeam";

export default function Command() {
  const { teams: teamsFromStorage, deleteTeam, currentTeam: currentTeamFromStorage, selectCurrentTeam } = useTeams();
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | undefined>(undefined);

  useEffect(() => {
    setTeams(teamsFromStorage);
  }, [teamsFromStorage]);

  useEffect(() => {
    setCurrentTeam(currentTeamFromStorage);
  }, [currentTeamFromStorage]);

  const _deleteTeam = (team: Team) => {
    (async () => {
      if (
        await confirmAlert({
          title: "Are you sure?",
          primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
        })
      ) {
        deleteTeam(team);
      }
    })();
  };

  // Whole-record identity: two credentials can share a Key ID (a key re-added under a
  // corrected Issuer ID), and comparing Key IDs alone marks both rows as current and
  // leaves neither offering "Use Team".
  const isCurrentTeam = (team: Team) => {
    return currentTeam !== undefined && isSameCredential(currentTeam, team);
  };

  const accessoriesForTeam = (team: Team) => {
    if (isCurrentTeam(team)) {
      return [{ icon: Icon.CheckCircle, tooltip: "A person" }];
    } else {
      return undefined;
    }
  };
  return (
    <List
      actions={
        <ActionPanel>
          <Action.Push
            title="Add New Team"
            icon={Icon.AddPerson}
            target={
              <AddTeam
                didSignIn={(team) => {
                  setTeams([...teams, team]);
                  setCurrentTeam(team);
                }}
              />
            }
          />
        </ActionPanel>
      }
    >
      {teams?.map((team: Team, index: number) => (
        <List.Item
          title={team.name}
          accessories={accessoriesForTeam(team)}
          subtitle={team.apiKey}
          key={`${team.apiKey}-${team.issuerID ?? "individual"}-${index}`}
          actions={
            <ActionPanel>
              <ActionPanel.Section title={team.name}>
                {!isCurrentTeam(team) && (
                  <Action
                    title="Use Team"
                    icon={Icon.CheckCircle}
                    onAction={() => {
                      selectCurrentTeam(team);
                      showToast({
                        style: Toast.Style.Success,
                        title: `Switched to ${team.name}`,
                      });
                    }}
                  />
                )}
                <Action
                  title="Delete Team"
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  onAction={() => {
                    _deleteTeam(team);
                  }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Add New Team"
                  icon={Icon.AddPerson}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={
                    <AddTeam
                      didSignIn={(team) => {
                        setTeams([...teams, team]);
                        selectCurrentTeam(team);
                      }}
                    />
                  }
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
