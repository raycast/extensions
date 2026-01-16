import type { ComponentProps } from "react";
import type { Image } from "@raycast/api";
import { Action, ActionPanel, Color, Icon, type List, Toast, showToast } from "@raycast/api";
import type { MatchFixture } from "@/types/team-detail";
import { useFavorite } from "@/hooks/useFavorite";
import { prettyDate } from "@/utils/date";
import { launchMatchDetailCommand } from "@/utils/launcher/launchMatchDetailCommand";
import { launchTeamCommand } from "@/utils/launcher/launchTeamDetailCommand";
import { buildLeagueLogoUrl, buildMatchDetailUrl, buildTeamDetailUrl, buildTeamLogoUrl } from "@/utils/url-builder";
import SafeListItem from "./SafeListItem";

// remove title and actions props from List.Item.Props and add match props
export type EnhancedMatchItemProps = Omit<ComponentProps<typeof List.Item>, "title" | "actions"> & {
  match: MatchFixture;
  additionalActions?: React.ReactNode;
  showTeamActions?: boolean;
};

export default function EnhancedMatchItem({
  match,
  additionalActions,
  showTeamActions = true,
  ...rest
}: EnhancedMatchItemProps) {
  const favoriteService = useFavorite();
  // Safety check for match object
  if (!match) {
    return (
      <SafeListItem
        title="No Match Data"
        subtitle="Match information is missing"
        icon={Icon.ExclamationMark}
        {...rest}
      />
    );
  }

  if (!match.home || !match.away || !match.status || !match.tournament) {
    return (
      <SafeListItem
        title="Invalid Match Data"
        subtitle="Match information is incomplete"
        icon={Icon.ExclamationMark}
        {...rest}
      />
    );
  }

  // Additional validation for required fields
  if (!match.home.name || !match.away.name) {
    return (
      <SafeListItem title="Unknown Teams" subtitle="Team names are missing" icon={Icon.ExclamationMark} {...rest} />
    );
  }
  const status: "ongoing" | "finished" | "not-started" | "postponed" = (() => {
    if (match.status?.ongoing === true) {
      return "ongoing";
    }

    if (match.status?.finished === true) {
      return "finished";
    }

    if (match.status?.cancelled === true) {
      return "postponed";
    }

    return "not-started";
  })();

  const result: "win" | "lose" | "draw" | "not-started" = (() => {
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

  const icon: Image = (() => {
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

  const title: string = (() => {
    const homeName = match.home?.name?.trim() || "Home Team";
    const awayName = match.away?.name?.trim() || "Away Team";
    const homeScore = match.home?.score ?? 0;
    const awayScore = match.away?.score ?? 0;

    let titleText = "";

    if (status === "ongoing") {
      titleText = `${match.status?.liveTime?.short ?? "On"} | ${homeName} ${homeScore} - ${awayScore} ${awayName}`;
    } else if (status === "finished") {
      titleText = `${match.status?.reason?.short ?? "FT"} | ${homeName} ${homeScore} - ${awayScore} ${awayName}`;
    } else if (status === "postponed") {
      titleText = `${match.status?.reason?.short ?? "PP"} | ${homeName} - ${awayName}`;
    } else {
      titleText = `${homeName} - ${awayName}`;
    }

    // Ensure title is never empty
    return titleText.trim() || `Match ${match.id || "Unknown"}`;
  })();

  const buildDefaultActions = () => {
    const isHomeTeamFavorited = favoriteService.teams.some((team) => team.id === match.home?.id?.toString());
    const isAwayTeamFavorited = favoriteService.teams.some((team) => team.id === match.away?.id?.toString());

    const homeTeamForFavorites = {
      id: match.home?.id?.toString() || "",
      name: match.home?.name || "Home Team",
      leagueId: match.tournament?.leagueId?.toString() || "",
    };

    const awayTeamForFavorites = {
      id: match.away?.id?.toString() || "",
      name: match.away?.name || "Away Team",
      leagueId: match.tournament?.leagueId?.toString() || "",
    };

    return (
      <ActionPanel>
        <ActionPanel.Section title="Match Actions">
          <Action
            icon={Icon.AppWindowSidebarRight}
            title="Show Match Details"
            onAction={() => {
              launchMatchDetailCommand(`${match.id}`);
            }}
          />
          <Action.OpenInBrowser icon={Icon.Globe} title="View Match on Fotmob" url={buildMatchDetailUrl(match.id)} />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title={`Copy Match ID (${match.id})`}
            content={match.id?.toString() || ""}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel.Section>

        {showTeamActions && (
          <ActionPanel.Section title="Team Actions">
            <Action
              icon={Icon.Person}
              title={`View ${match.home?.name || "Home Team"} Details`}
              onAction={() => {
                launchTeamCommand(`${match.home?.id || 0}`);
              }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
            />
            <Action
              icon={Icon.Person}
              title={`View ${match.away?.name || "Away Team"} Details`}
              onAction={() => {
                launchTeamCommand(`${match.away?.id || 0}`);
              }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
            <Action.OpenInBrowser
              icon={Icon.Globe}
              title={`View ${match.home?.name || "Home Team"} on Fotmob`}
              url={buildTeamDetailUrl(match.home?.id || 0)}
            />
            <Action.OpenInBrowser
              icon={Icon.Globe}
              title={`View ${match.away?.name || "Away Team"} on Fotmob`}
              url={buildTeamDetailUrl(match.away?.id || 0)}
            />
          </ActionPanel.Section>
        )}

        {showTeamActions && (
          <ActionPanel.Section title="Team Favorites">
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              title={`Copy ${match.home?.name || "Home Team"} ID (${match.home?.id})`}
              content={match.home?.id?.toString() || ""}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              title={`Copy ${match.away?.name || "Away Team"} ID (${match.away?.id})`}
              content={match.away?.id?.toString() || ""}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />

            {isHomeTeamFavorited ? (
              <Action
                icon={Icon.StarDisabled}
                title={`Remove`}
                onAction={async () => {
                  await favoriteService.removeItems("team", match.home?.id?.toString() || "");
                  showToast({
                    style: Toast.Style.Success,
                    title: "Removed from favorites",
                    message: `${match.home?.name} removed from favorites`,
                  });
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              />
            ) : (
              <Action
                icon={Icon.Star}
                title={`Add ${match.home?.name || "Home Team"} to Favorites`}
                onAction={async () => {
                  await favoriteService.addItems({
                    type: "team",
                    value: homeTeamForFavorites,
                  });
                  showToast({
                    style: Toast.Style.Success,
                    title: "Added to favorites",
                    message: `${match.home?.name} added to favorites`,
                  });
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              />
            )}

            {isAwayTeamFavorited ? (
              <Action
                icon={Icon.StarDisabled}
                title={`Remove`}
                onAction={async () => {
                  await favoriteService.removeItems("team", match.away?.id?.toString() || "");
                  showToast({
                    style: Toast.Style.Success,
                    title: "Removed from favorites",
                    message: `${match.away?.name} removed from favorites`,
                  });
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              />
            ) : (
              <Action
                icon={Icon.Star}
                title={`Add ${match.away?.name || "Away Team"} to Favorites`}
                onAction={async () => {
                  await favoriteService.addItems({
                    type: "team",
                    value: awayTeamForFavorites,
                  });
                  showToast({
                    style: Toast.Style.Success,
                    title: "Added to favorites",
                    message: `${match.away?.name} added to favorites`,
                  });
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              />
            )}
          </ActionPanel.Section>
        )}

        {additionalActions && <ActionPanel.Section title="Additional Actions">{additionalActions}</ActionPanel.Section>}
      </ActionPanel>
    );
  };

  return (
    <SafeListItem
      {...rest}
      title={title}
      subtitle={prettyDate(match.status?.utcTime || "")}
      icon={icon}
      accessories={[
        {
          icon: buildLeagueLogoUrl(match.tournament?.leagueId || 0, "dark"),
          tag: match.tournament?.name || "Tournament",
        },
        {
          icon: buildTeamLogoUrl(match.home?.id || 0),
          tooltip: match.home?.name || "Home Team",
        },
        {
          icon: buildTeamLogoUrl(match.away?.id || 0),
          tooltip: match.away?.name || "Away Team",
        },
      ]}
      actions={buildDefaultActions()}
    />
  );
}
