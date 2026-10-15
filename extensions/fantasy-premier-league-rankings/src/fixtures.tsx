import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ReactNode, useState } from "react";
import { fetchFixtures, fixturesUrl } from "./api/fpl";
import type { Fixture } from "./api/types";
import { FixtureDetail } from "./components/FixtureDetail";
import { useBootstrap, useMySquad } from "./hooks";
import { BootstrapIndex, teamBadgeUrl, teamName, teamShort } from "./lib/bootstrap";
import { fdrColor, formatDeadline, formatKickoff } from "./lib/format";

export default function Command() {
  const { index, isLoading: loadingBootstrap } = useBootstrap();
  const squad = useMySquad();
  const [selected, setSelected] = useState<number | undefined>();
  const playing = index?.currentEvent && !index.currentEvent.finished ? index.currentEvent : undefined;
  const defaultEvent = playing?.id ?? index?.nextEvent?.id ?? index?.currentEvent?.id;
  const event = selected ?? defaultEvent;
  const { data: fixtures, isLoading } = useCachedPromise(fetchFixtures, [event ?? 0], { execute: event != null });

  const eventInfo = index?.events.find((e) => e.id === event);
  const lastEvent = index?.events.at(-1)?.id ?? 38;
  const gameweekActions = (
    <>
      {event != null && event > 1 && (
        <Action
          title={`Previous Gameweek (${event - 1})`}
          icon={Icon.ArrowLeft}
          shortcut={{ modifiers: ["cmd"], key: "[" }}
          onAction={() => setSelected(event - 1)}
        />
      )}
      {event != null && event < lastEvent && (
        <Action
          title={`Next Gameweek (${event + 1})`}
          icon={Icon.ArrowRight}
          shortcut={{ modifiers: ["cmd"], key: "]" }}
          onAction={() => setSelected(event + 1)}
        />
      )}
    </>
  );
  const byDay = new Map<string, Fixture[]>();
  for (const fixture of fixtures ?? []) {
    const day = fixture.kickoff_time
      ? new Date(fixture.kickoff_time).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
      : "Date TBC";
    byDay.set(day, [...(byDay.get(day) ?? []), fixture]);
  }

  return (
    <List
      isLoading={isLoading || loadingBootstrap}
      searchBarPlaceholder="Filter by team"
      searchBarAccessory={
        index ? (
          <List.Dropdown tooltip="Gameweek" value={String(event ?? "")} onChange={(v) => setSelected(Number(v))}>
            {index.events.map((e) => (
              <List.Dropdown.Item key={e.id} value={String(e.id)} title={e.name} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {eventInfo && new Date(eventInfo.deadline_time) > new Date() && (
        <List.Section title={eventInfo.name}>
          <List.Item
            icon={Icon.Clock}
            title="Deadline"
            subtitle={formatDeadline(eventInfo.deadline_time)}
            accessories={[{ icon: Icon.Link, tooltip: "Opens on the FPL website" }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Fixtures on FPL" url={fixturesUrl(eventInfo.id)} />
                {gameweekActions}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {index &&
        [...byDay.entries()].map(([day, dayFixtures]) => (
          <List.Section key={day} title={day}>
            {dayFixtures.map((fixture) => (
              <FixtureItem key={fixture.id} fixture={fixture} index={index} squad={squad}>
                {gameweekActions}
              </FixtureItem>
            ))}
          </List.Section>
        ))}
    </List>
  );
}

interface FixtureItemProps {
  fixture: Fixture;
  index: BootstrapIndex;
  squad?: Set<number>;
  children: ReactNode;
}

function FixtureItem({ fixture, index, squad, children }: FixtureItemProps) {
  const home = index.teams.get(fixture.team_h);
  const away = index.teams.get(fixture.team_a);
  const played = fixture.started || fixture.finished;
  const score = played ? `${fixture.team_h_score ?? 0} - ${fixture.team_a_score ?? 0}` : "v";
  const status = fixture.finished
    ? "FT"
    : fixture.started
      ? `${fixture.minutes}'`
      : formatKickoff(fixture.kickoff_time).split(" ").slice(-1)[0];
  const myPlayers = squad
    ? [...squad]
        .map((id) => index.players.get(id))
        .filter((p) => p && (p.team === fixture.team_h || p.team === fixture.team_a))
        .map((p) => p!.web_name)
    : [];

  return (
    <List.Item
      icon={home ? { source: teamBadgeUrl(home), fallback: Icon.SoccerBall } : Icon.SoccerBall}
      title={`${teamShort(index, fixture.team_h)}  ${score}  ${teamShort(index, fixture.team_a)}`}
      subtitle={`${teamName(index, fixture.team_h)} v ${teamName(index, fixture.team_a)}`}
      keywords={[home?.name ?? "", away?.name ?? "", ...myPlayers]}
      accessories={[
        ...(myPlayers.length
          ? [{ icon: Icon.Star, text: myPlayers.join(", "), tooltip: "Your players in this fixture" }]
          : []),
        {
          tag: {
            value: `${teamShort(index, fixture.team_h)} ${fixture.team_h_difficulty}`,
            color: fdrColor(fixture.team_h_difficulty),
          },
        },
        {
          tag: {
            value: `${teamShort(index, fixture.team_a)} ${fixture.team_a_difficulty}`,
            color: fdrColor(fixture.team_a_difficulty),
          },
        },
        { text: { value: status, color: fixture.started && !fixture.finished ? Color.Green : Color.SecondaryText } },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Fixture Details"
            icon={Icon.TwoPeople}
            target={<FixtureDetail fixture={fixture} index={index} squad={squad} />}
          />
          <Action.OpenInBrowser title="Open Fixtures on FPL" url={fixturesUrl(fixture.event ?? 1)} />
          {children}
        </ActionPanel>
      }
    />
  );
}
