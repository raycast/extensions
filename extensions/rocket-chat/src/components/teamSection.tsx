import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Team } from "../models/user";
import { getConfig } from "../config";

export function TeamSection({ teams }: { teams: Team[] }) {
  const config = getConfig();

  return (
    <>
      {teams.length >= 1 && (
        <List.Section title={`Teams ${teams.length.toString()}`}>
          {teams.map((team) => (
            <List.Item
              key={team._id}
              icon={`${config.baseUrl}/avatar/room/${team._id}?size=50`}
              title={team.name}
              accessories={[
                {
                  icon: Icon.TwoPeople,
                  text: {
                    value: team.usersCount.toString(),
                  },
                },
              ]}
              actions={
                <ActionPanel title={team.name}>
                  <Action.OpenInBrowser title="Chat" url={`${config.baseUrl}/group/${team.name}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </>
  );
}
