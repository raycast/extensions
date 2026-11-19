import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import {
  formatDurationHM,
  getMemberStatus,
  getProjectColor,
  getTeams,
  type Member,
  type Team,
} from "./api";
import { ListErrorView } from "./error-view";

function memberDisplayName(member: Member): string {
  if (member.displayName && member.displayName.trim().length > 0) {
    return member.displayName;
  }
  const parts = [member.firstname, member.lastname].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return member.email ?? "Unknown member";
}

function activeDuration(member: Member): number {
  const start = member.activity?.startDateTime;
  if (!start) return 0;
  const startMs = new Date(start).getTime();
  if (Number.isNaN(startMs)) return 0;
  return Date.now() - startMs;
}

export default function TeamStatus() {
  const [teamId, setTeamId] = useState<string | undefined>(undefined);

  const teams = useCachedPromise(getTeams, [], {
    initialData: [] as Team[],
    failureToastOptions: { title: "Failed to load teams" },
  });

  useEffect(() => {
    if (!teamId && teams.data.length > 0) setTeamId(teams.data[0].id);
  }, [teams.data, teamId]);

  const members = useCachedPromise(
    async (id: string | undefined) => {
      if (!id) return [];
      return getMemberStatus({ teamId: id });
    },
    [teamId],
    {
      keepPreviousData: true,
      initialData: [] as Member[],
      failureToastOptions: { title: "Failed to load member status" },
    },
  );

  const { running, idle } = useMemo(() => {
    const r: Member[] = [];
    const i: Member[] = [];
    for (const m of members.data) {
      if (m.activity?.running) r.push(m);
      else i.push(m);
    }
    return { running: r, idle: i };
  }, [members.data]);

  const failure = teams.error ?? members.error;
  if (failure && members.data.length === 0) {
    return (
      <List>
        <ListErrorView
          error={failure}
          what="your team"
          onRetry={() =>
            teams.error ? teams.revalidate() : members.revalidate()
          }
        />
      </List>
    );
  }

  if (!teams.isLoading && teams.data.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.PersonCircle}
          title="You are not a member of any team yet."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={teams.isLoading || members.isLoading}
      searchBarPlaceholder="Search members..."
      searchBarAccessory={
        teams.data.length > 0 ? (
          <List.Dropdown
            tooltip="Team"
            storeValue
            value={teamId}
            onChange={setTeamId}
          >
            {teams.data.map((team) => (
              <List.Dropdown.Item
                key={team.id}
                title={team.name}
                value={team.id}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.Section
        title="Working"
        subtitle={`${running.length} member${running.length === 1 ? "" : "s"}`}
      >
        {running.map((member) => (
          <List.Item
            key={member.uid}
            icon={{ source: Icon.Person, tintColor: Color.Green }}
            title={memberDisplayName(member)}
            subtitle={member.activity?.projectTitle ?? member.email}
            accessories={[
              {
                tag: {
                  value: formatDurationHM(activeDuration(member)),
                  color: Color.Green,
                },
                icon: {
                  source: Icon.Circle,
                  tintColor: getProjectColor(
                    member.activity?.projectColor ?? 0,
                  ),
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => members.revalidate()}
                />
                {member.email ? (
                  <Action.CopyToClipboard
                    title="Copy Email"
                    content={member.email}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section
        title="Idle"
        subtitle={`${idle.length} member${idle.length === 1 ? "" : "s"}`}
      >
        {idle.map((member) => (
          <List.Item
            key={member.uid}
            icon={{ source: Icon.Person, tintColor: Color.SecondaryText }}
            title={memberDisplayName(member)}
            subtitle={member.email}
            accessories={[
              { tag: { value: "Idle", color: Color.SecondaryText } },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => members.revalidate()}
                />
                {member.email ? (
                  <Action.CopyToClipboard
                    title="Copy Email"
                    content={member.email}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
