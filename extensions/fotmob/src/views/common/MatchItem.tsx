import type { ComponentProps } from "react";
import type { Image } from "@raycast/api";
import { Color, Icon, List } from "@raycast/api";
import type { MatchFixture } from "@/types/team-detail";
import { prettyDate } from "@/utils/date";
import { buildLeagueLogoUrl, buildTeamLogoUrl } from "@/utils/url-builder";

// remove title props from List.Item.Props and add match props
export type MatchItemProps = Omit<ComponentProps<typeof List.Item>, "title"> & {
  match: MatchFixture;
};

export default function MatchItem({ match, ...rest }: MatchItemProps) {
  const status: "ongoing" | "finished" | "not-started" | "postponed" = (function () {
    if (match.status.ongoing === true) {
      return "ongoing";
    }

    if (match.status.finished === true) {
      return "finished";
    }

    if (match.status.cancelled === true) {
      return "postponed";
    }

    return "not-started";
  })();

  const result: "win" | "lose" | "draw" | "not-started" = (function () {
    if (match.result != null) {
      if (match.result > 0) {
        return "win";
      }

      if (match.result < 0) {
        return "lose";
      }

      return "draw";
    }

    return "not-started";
  })();

  const icon: Image = (function () {
    if (status === "ongoing") {
      return {
        source: Icon.PlayFilled,
        tintColor: Color.Green,
      };
    }

    if (status === "finished") {
      switch (result) {
        case "win":
          return {
            source: Icon.CheckCircle,
            tintColor: Color.Green,
          };
        case "lose":
          return {
            source: Icon.XMarkCircleFilled,
            tintColor: Color.Red,
          };
        case "draw":
          return {
            source: Icon.MinusCircleFilled,
            tintColor: Color.Yellow,
          };
      }
    }

    if (status === "postponed") {
      return {
        source: Icon.XMarkCircleFilled,
        tintColor: Color.Red,
      };
    }

    return {
      source: Icon.Calendar,
      tintColor: Color.Blue,
    };
  })();

  const title: string = (function () {
    if (status === "ongoing") {
      return `${match.status.liveTime?.short ?? "On"} | ${match.home.name} ${match.home.score} - ${match.away.score} ${
        match.away.name
      }`;
    }

    if (status === "finished") {
      return `${match.status.reason?.short ?? "FT"} | ${match.home.name} ${match.home.score} - ${match.away.score} ${
        match.away.name
      }`;
    }

    if (status === "postponed") {
      return `${match.status.reason?.short ?? "PP"} | ${match.home.name} - ${match.away.name}`;
    }

    return `${match.home.name} - ${match.away.name}`;
  })();

  return (
    <List.Item
      {...rest}
      title={title}
      subtitle={prettyDate(match.status.utcTime)}
      icon={icon}
      accessories={[
        {
          icon: buildLeagueLogoUrl(match.tournament.leagueId, "dark"),
          tag: match.tournament.name,
        },
        {
          icon: buildTeamLogoUrl(match.home.id),
        },
        {
          icon: buildTeamLogoUrl(match.away.id),
        },
      ]}
    />
  );
}
