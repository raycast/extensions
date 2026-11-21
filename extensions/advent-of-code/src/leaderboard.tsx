import { Action, ActionPanel, Color, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import {
  Leaderboard,
  Member,
  SessionError,
  getLeaderboard,
  getLeaderboardIds,
  leaderboardUrl,
  memberName,
} from "./lib/aoc";
import { formatSolveTime, latestYear, puzzleCount, years } from "./lib/calendar";

// The board carries its own year: while another year loads, the previous board stays on screen with its own dates
async function loadBoard(
  year: number,
  selected?: string,
): Promise<{ year: number; ids: string[]; id: string; board: Leaderboard }> {
  const ids = await getLeaderboardIds(year);
  const id = selected && ids.includes(selected) ? selected : ids[0];
  return { year, ids, id, board: await getLeaderboard(year, id) };
}

export default function Command() {
  const [year, setYear] = useCachedState("leaderboard-year", latestYear());
  const [selected, setSelected] = useCachedState<string | undefined>("leaderboard-id", undefined);
  const { data, isLoading, error, revalidate } = usePromise(loadBoard, [year, selected], {
    failureToastOptions: { title: "Couldn't load the leaderboard" },
  });

  const members = data ? Object.values(data.board.members).sort(byRank) : [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={members.length > 0}
      searchBarPlaceholder="Search members"
      searchBarAccessory={
        <List.Dropdown tooltip="Event" value={String(year)} onChange={(value) => setYear(Number(value))}>
          {years().map((y) => (
            <List.Dropdown.Item key={y} value={String(y)} title={String(y)} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={error instanceof SessionError ? "Session cookie needed" : "Couldn't load the leaderboard"}
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView icon={Icon.TwoPeople} title="Nobody here yet" />
      )}
      {data && (
        <List.Section
          title={`Leaderboard #${data.id}`}
          subtitle={members.length === 1 ? "1 member" : `${members.length} members`}
        >
          {members.map((member, index) => (
            <List.Item
              key={member.id}
              title={`${index + 1}. ${memberName(member)}`}
              icon={{ source: Icon.Person, tintColor: index === 0 ? Color.Yellow : undefined }}
              accessories={[{ text: `${member.local_score} pts` }, { text: `${member.stars}⭐` }]}
              detail={<List.Item.Detail markdown={memberMarkdown(member, data.year)} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={leaderboardUrl(data.year, data.id)} />
                  <Action.CopyToClipboard title="Copy Name" content={memberName(member)} />
                  {data.ids.length > 1 && (
                    <ActionPanel.Submenu title="Switch Leaderboard" icon={Icon.Switch}>
                      {data.ids
                        .filter((id) => id !== data.id)
                        .map((id) => (
                          <Action key={id} title={`#${id}`} onAction={() => setSelected(id)} />
                        ))}
                    </ActionPanel.Submenu>
                  )}
                  <Action
                    title="Reload"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function byRank(a: Member, b: Member): number {
  return b.local_score - a.local_score || b.stars - a.stars || a.last_star_ts - b.last_star_ts;
}

function memberMarkdown(member: Member, year: number): string {
  const rows: string[] = [];
  for (let day = 1; day <= puzzleCount(year); day++) {
    const parts = member.completion_day_level[String(day)];
    if (!parts) continue;
    const first = parts["1"] ? formatSolveTime(year, day, parts["1"].get_star_ts) : "–";
    const second = parts["2"] ? formatSolveTime(year, day, parts["2"].get_star_ts) : "–";
    rows.push(`| ${day} | ${first} | ${second} |`);
  }
  const table = rows.length
    ? ["| Day | Part 1 | Part 2 |", "| --- | --- | --- |", ...rows].join("\n")
    : "No stars yet this year.";
  return `## ${memberName(member)}\n\n**${member.local_score}** points · **${member.stars}** stars\n\n${table}\n\n*Times are measured from when each puzzle unlocked.*`;
}
