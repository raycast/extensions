import { Color, Icon, Image, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getMatchEvents } from "../api";
import ErrorView from "./error_view";
import { Match, MatchEvent } from "../types";
import { matchTitle, playerName, teamLogo, teamName } from "../utils";

const PHASES: Record<string, string> = {
  FIRST_HALF: "First Half",
  SECOND_HALF: "Second Half",
  EXTRA_TIME_FIRST_HALF: "Extra Time – First Half",
  EXTRA_TIME_SECOND_HALF: "Extra Time – Second Half",
  PENALTY: "Penalty Shoot-out",
};

const describe = (
  event: MatchEvent,
): { icon: Image.ImageLike; title: string; subtitle?: string } | undefined => {
  const primary = event.primaryActor?.person
    ? playerName(event.primaryActor.person)
    : undefined;
  const secondary = event.secondaryActor?.person
    ? playerName(event.secondaryActor.person)
    : undefined;
  const score = event.totalScore
    ? `${event.totalScore.home} - ${event.totalScore.away}`
    : undefined;

  switch (event.type) {
    case "GOAL":
      return {
        icon: { source: Icon.SoccerBall, tintColor: Color.Green },
        title: `Goal! ${primary ?? ""}${["OWN", "OWN_GOAL"].includes(event.subType ?? "") ? " (OG)" : ""}${event.subType === "PENALTY" ? " (P)" : ""}`,
        subtitle: score,
      };
    case "DISALLOWED_GOAL":
      return {
        icon: { source: Icon.SoccerBall, tintColor: Color.SecondaryText },
        title: `Goal disallowed – ${primary ?? ""}`,
      };
    case "PENALTY":
      return {
        icon: { source: Icon.Dot, tintColor: Color.Orange },
        title: `Penalty${primary ? ` – ${primary}` : ""}`,
        subtitle: event.subType,
      };
    case "YELLOW_CARD":
      return {
        icon: { source: Icon.StopFilled, tintColor: Color.Yellow },
        title: `Yellow card – ${primary ?? ""}`,
      };
    case "YELLOW_CARD_SECOND":
    case "RED_YELLOW_CARD":
      return {
        icon: { source: Icon.StopFilled, tintColor: Color.Orange },
        title: `Second yellow – ${primary ?? ""}`,
      };
    case "RED_CARD":
      return {
        icon: { source: Icon.StopFilled, tintColor: Color.Red },
        title: `Red card – ${primary ?? ""}`,
      };
    case "SUBSTITUTION":
      return {
        icon: { source: Icon.Switch, tintColor: Color.Blue },
        title: `On: ${secondary ?? "?"}`,
        subtitle: primary ? `Off: ${primary}` : undefined,
      };
    case "VAR":
    case "VAR_CHECK":
      return {
        icon: { source: Icon.Monitor, tintColor: Color.Purple },
        title: "VAR check",
        subtitle: event.varInfo?.decision,
      };
    case "START_PHASE":
      return {
        icon: Icon.Stopwatch,
        title: `Kick-off – ${PHASES[event.phase] ?? event.phase}`,
      };
    case "END_PHASE":
      return {
        icon: Icon.Stopwatch,
        title: `End of ${PHASES[event.phase] ?? event.phase}`,
        subtitle: score,
      };
    case "INJURY_TIME":
      return {
        icon: Icon.Hourglass,
        title: `${event.injuryTimeMinutesAdded ?? "?"} minute(s) added`,
      };
    case "FULL_TIME":
      return {
        icon: { source: Icon.Flag, tintColor: Color.PrimaryText },
        title: "Full time",
        subtitle: score,
      };
    default:
      return undefined;
  }
};

export default function MatchTimeline({ match }: { match: Match }) {
  const {
    data = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(getMatchEvents, [match.id]);

  const items = data
    .map((event) => ({ event, view: describe(event) }))
    .filter((x) => x.view);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${matchTitle(match)} | Timeline`}
    >
      {error ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Message}
          title="No events yet"
          description="Key moments will appear once the match starts."
        />
      )}
      {items.map(({ event, view }) => {
        const team = event.primaryActor?.team;
        const minute = event.time
          ? `${event.time.minute}${event.time.injuryMinute ? `+${event.time.injuryMinute}` : ""}'`
          : "";

        return (
          <List.Item
            key={event.id}
            icon={view!.icon}
            title={view!.title}
            subtitle={view!.subtitle}
            accessories={[
              ...(team
                ? [{ icon: teamLogo(team), tooltip: teamName(team) }]
                : []),
              { text: minute },
            ]}
          />
        );
      })}
    </List>
  );
}
