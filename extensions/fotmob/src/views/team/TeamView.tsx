import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useFavorite } from "@/hooks/useFavorite";
import { useTeamDetail } from "@/hooks/useTeamDetail";
import { prettyDate } from "@/utils/date";
import { buildLeagueLogoUrl, buildTeamLogoUrl } from "@/utils/url-builder";
import EnhancedMatchItem from "../common/EnhancedMatchItem";
import SafeListItem from "../common/SafeListItem";

export default function TeamView({ id }: { id: string }) {
  const { data, isLoading, error } = useTeamDetail(id);
  const favoriteService = useFavorite();

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Team Details"
          description={error.message || "Failed to load team information"}
        />
      </List>
    );
  }

  if (!data || !data.fixtures) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="No Team Data"
          description="Unable to find information for this team"
        />
      </List>
    );
  }

  const teamName = data?.details?.name?.trim() || `Team ${id}`;
  const ongoingMatch = data?.calculated?.ongoingMatch;
  const nextMatches = data?.calculated?.nextMatches?.slice(0, 8) || [];
  const lastMatches = data?.calculated?.previousMatches?.slice(0, 8) || [];

  const formatFormString = (formString: string) => {
    if (!formString) return "";
    return formString
      .split("")
      .map((result) => {
        switch (result) {
          case "W":
            return "🟢";
          case "D":
            return "🟡";
          case "L":
            return "🔴";
          default:
            return "";
        }
      })
      .join(" ");
  };

  const safeTeamName = teamName?.trim() && teamName !== "undefined" && teamName !== "null" ? teamName : `Team ${id}`;

  // Check if team is already in favorites
  const isTeamFavorited = favoriteService.teams.some((team) => team.id === id);

  // Create team object for favorites
  const teamForFavorites = {
    id,
    name: safeTeamName,
    leagueId: data?.details?.primaryLeagueId?.toString() || "",
  };

  return (
    <List navigationTitle={`${safeTeamName} - Team Details`}>
      {/* Team Overview Section */}
      <List.Section title="Team Overview">
        <SafeListItem
          title={safeTeamName}
          subtitle={`${data?.details?.country || ""} • ${data?.details?.latestSeason || "Current Season"}`}
          icon={buildTeamLogoUrl(parseInt(id))}
          accessories={[
            ...(data?.details?.shortName ? [{ text: data.details.shortName }] : []),
            ...(data?.calculated?.currentLeaguePosition
              ? [
                  {
                    text: `League Position: ${data.calculated.currentLeaguePosition}`,
                    icon: Icon.Trophy,
                  },
                ]
              : []),
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={Icon.Globe}
                title="View Team on Fotmob"
                url={`https://www.fotmob.com/teams/${id}`}
              />
              <Action.CopyToClipboard
                icon={Icon.Clipboard}
                title={`Copy Team ID (${id})`}
                content={id}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              {isTeamFavorited ? (
                <Action
                  icon={Icon.StarDisabled}
                  title="Remove from Favorites"
                  onAction={async () => {
                    await favoriteService.removeItems("team", id);
                    showToast({
                      style: Toast.Style.Success,
                      title: "Removed from favorites",
                      message: `${safeTeamName} removed from favorites`,
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              ) : (
                <Action
                  icon={Icon.Star}
                  title="Add to Favorites"
                  onAction={async () => {
                    await favoriteService.addItems({
                      type: "team",
                      value: teamForFavorites,
                    });
                    showToast({
                      style: Toast.Style.Success,
                      title: "Added to favorites",
                      message: `${safeTeamName} added to favorites`,
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                />
              )}
            </ActionPanel>
          }
        />

        {/* Stadium Information */}
        {data?.overview?.venue?.name && (
          <SafeListItem
            title={data.overview.venue.name}
            subtitle={`Home Stadium • ${data.overview.venue.city || "Unknown City"}, ${
              data.overview.venue.country?.name || ""
            }`}
            icon={Icon.Building}
            accessories={[
              {
                text: `Capacity: ${data.overview.venue.capacity?.toLocaleString() || "Unknown"}`,
              },
              ...(data.overview.venue.opened ? [{ text: `Opened: ${data.overview.venue.opened}` }] : []),
            ]}
          />
        )}

        {/* Primary League */}
        {data?.details?.primaryLeagueName && (
          <SafeListItem
            title={data.details.primaryLeagueName}
            subtitle="Primary League"
            icon={data.details.primaryLeagueId ? buildLeagueLogoUrl(data.details.primaryLeagueId, "dark") : Icon.Trophy}
            accessories={[{ text: data.overview?.season || "Current Season" }]}
          />
        )}

        {/* Team Form */}
        {(data?.calculated?.teamFormResults || data?.calculated?.recentFormString) && (
          <SafeListItem
            title="Recent Form"
            subtitle={
              formatFormString(data.calculated.teamFormResults || data.calculated.recentFormString || "") ||
              "No recent form data"
            }
            icon={Icon.BarChart}
            accessories={[
              {
                text: `Last ${(data.calculated.teamFormResults || data.calculated.recentFormString || "").length} matches`,
              },
            ]}
          />
        )}

        {/* Next Match Countdown */}
        {data?.calculated?.upcomingMatch && data?.calculated?.nextMatchCountdown && (
          <SafeListItem
            title="Next Match"
            subtitle={`${data.calculated.upcomingMatch.home?.name || "Home"} vs ${
              data.calculated.upcomingMatch.away?.name || "Away"
            }`}
            icon={Icon.Clock}
            accessories={[
              { text: data.calculated.nextMatchCountdown },
              {
                text: prettyDate(data.calculated.upcomingMatch.status?.utcTime || ""),
              },
            ]}
          />
        )}
      </List.Section>

      {/* League Table Position */}
      {data?.overview?.table?.all && Array.isArray(data.overview.table.all) && data.overview.table.all.length > 0 && (
        <List.Section title="League Position">
          {data.overview.table.all
            .filter((team) => team?.id?.toString() === id)
            .map((team) => {
              const teamName = team?.name || "Unknown Team";
              const position = team?.idx || 0;
              const points = team?.pts || 0;
              const played = team?.played || 0;

              return (
                <SafeListItem
                  key={team?.id || `team-${Math.random()}`}
                  title={`${position}. ${teamName}`}
                  subtitle={`${points} points • ${played} played`}
                  icon={
                    position <= 4
                      ? { source: Icon.Trophy, tintColor: Color.Green }
                      : position <= 6
                        ? { source: Icon.Star, tintColor: Color.Blue }
                        : Icon.Dot
                  }
                  accessories={[
                    {
                      text: `${team?.wins || 0}W ${team?.draws || 0}D ${team?.losses || 0}L`,
                    },
                    { text: team?.scoresStr || "0-0" },
                    {
                      text: `GD: ${(team?.goalConDiff || 0) > 0 ? "+" : ""}${team?.goalConDiff || 0}`,
                      icon: {
                        source: (team?.goalConDiff || 0) >= 0 ? Icon.ArrowUp : Icon.ArrowDown,
                        tintColor: (team?.goalConDiff || 0) >= 0 ? Color.Green : Color.Red,
                      },
                    },
                  ]}
                />
              );
            })}
        </List.Section>
      )}

      {/* Top Players */}
      {data?.overview?.topPlayers && Array.isArray(data.overview.topPlayers) && data.overview.topPlayers.length > 0 && (
        <List.Section title="Top Players">
          {data.overview.topPlayers.slice(0, 5).map((player) => {
            const playerName = player?.name || "Unknown Player";
            const goals = player?.goals || 0;
            const assists = player?.assists || 0;
            const rating = player?.rating || 0;
            const country = player?.cname || "";

            return (
              <SafeListItem
                key={player?.id || `player-${Math.random()}`}
                title={playerName}
                subtitle={`${goals} goals • ${assists} assists`}
                icon={Icon.Person}
                accessories={[
                  { text: `Rating: ${rating.toFixed(1)}` },
                  ...(country ? [{ text: country }] : []),
                  ...(player?.injured
                    ? [
                        {
                          icon: {
                            source: Icon.XMarkCircle,
                            tintColor: Color.Red,
                          },
                        },
                      ]
                    : []),
                ]}
              />
            );
          })}
        </List.Section>
      )}

      {/* Team Colors */}
      {(() => {
        const colors = data?.overview?.teamColors;
        if (!colors) return null;

        const hasValidPrimary =
          colors.primary &&
          colors.primary !== "Unknown" &&
          colors.primary.trim() !== "" &&
          colors.primary.toLowerCase() !== "unknown";

        const hasValidSecondary =
          colors.secondary &&
          colors.secondary !== "Unknown" &&
          colors.secondary.trim() !== "" &&
          colors.secondary.toLowerCase() !== "unknown";

        const hasValidText =
          colors.text &&
          colors.text !== "Unknown" &&
          colors.text.trim() !== "" &&
          colors.text.toLowerCase() !== "unknown";

        if (!hasValidPrimary && !hasValidSecondary && !hasValidText) return null;

        const isHexColor = (color: string) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);

        return (
          <List.Section title="Team Colors">
            <SafeListItem
              title="Team Colors"
              subtitle={
                hasValidPrimary && hasValidSecondary
                  ? `Primary: ${isHexColor(colors.primary) ? colors.primary.toUpperCase() : colors.primary} • Secondary: ${isHexColor(colors.secondary) ? colors.secondary.toUpperCase() : colors.secondary}`
                  : hasValidPrimary
                    ? `Primary: ${isHexColor(colors.primary) ? colors.primary.toUpperCase() : colors.primary}`
                    : hasValidSecondary
                      ? `Secondary: ${isHexColor(colors.secondary) ? colors.secondary.toUpperCase() : colors.secondary}`
                      : "Color information available"
              }
              icon={
                hasValidPrimary && isHexColor(colors.primary)
                  ? { source: Icon.Circle, tintColor: colors.primary }
                  : Icon.Circle
              }
              accessories={[...(hasValidText ? [{ text: `Text: ${colors.text}` }] : [])]}
            />
          </List.Section>
        );
      })()}

      {/* Ongoing Match */}
      {ongoingMatch?.id && (
        <List.Section title="Live Match">
          <EnhancedMatchItem key={ongoingMatch.id} match={ongoingMatch} />
        </List.Section>
      )}

      {/* Upcoming Matches */}
      {nextMatches?.length > 0 && nextMatches.filter((match) => match?.id).length > 0 && (
        <List.Section title="Upcoming Matches">
          {nextMatches
            .filter((match) => match?.id && match?.home && match?.away)
            .map((match) => (
              <EnhancedMatchItem key={match.id} match={match} />
            ))}
        </List.Section>
      )}

      {/* Recent Matches */}
      {lastMatches?.length > 0 && lastMatches.filter((match) => match?.id).length > 0 && (
        <List.Section title="Recent Matches">
          {lastMatches
            .filter((match) => match?.id && match?.home && match?.away)
            .map((match) => (
              <EnhancedMatchItem key={match.id} match={match} />
            ))}
        </List.Section>
      )}

      {/* Squad Information (if available) */}
      {data?.squad && Array.isArray(data.squad) && data.squad.length > 0 && (
        <List.Section title="Squad">
          {data.squad.slice(0, 8).map((player) => {
            const playerName = player?.name || "Unknown Player";
            const position = player?.position?.strPos || "Player";
            const shirtNo = player?.shirtNo;
            const age = player?.age;
            const countryCode = player?.country?.code;

            return (
              <SafeListItem
                key={player?.id || `squad-${Math.random()}`}
                title={playerName}
                subtitle={position}
                icon={Icon.Person}
                accessories={[
                  ...(shirtNo ? [{ text: `#${shirtNo}` }] : []),
                  ...(age ? [{ text: `${age}y` }] : []),
                  ...(countryCode ? [{ text: countryCode }] : []),
                  ...(player?.injured
                    ? [
                        {
                          icon: {
                            source: Icon.XMarkCircle,
                            tintColor: Color.Red,
                          },
                        },
                      ]
                    : []),
                  ...(player?.suspended
                    ? [
                        {
                          icon: {
                            source: Icon.ExclamationMark,
                            tintColor: Color.Orange,
                          },
                        },
                      ]
                    : []),
                ]}
              />
            );
          })}
          {data.squad.length > 8 && (
            <SafeListItem
              title={`View All ${data.squad.length} Players`}
              subtitle="Complete squad information"
              icon={Icon.Person}
            />
          )}
        </List.Section>
      )}

      {/* Transfer Activity */}
      {data?.transfers?.data?.transfers && (
        <>
          {/* Incoming Transfers */}
          {data.transfers.data.transfers.transfersIn &&
            Array.isArray(data.transfers.data.transfers.transfersIn) &&
            data.transfers.data.transfers.transfersIn.length > 0 && (
              <List.Section title="Recent Signings">
                {data.transfers.data.transfers.transfersIn.slice(0, 3).map((transfer, index) => {
                  const playerName = transfer?.name || "Unknown Player";
                  const fromClub = transfer?.fromClub || "Unknown Club";
                  const fromDate = transfer?.fromDate;
                  const feeText = transfer?.fee?.feeText || "Fee undisclosed";
                  const isLoan = transfer?.onLoan;

                  return (
                    <SafeListItem
                      key={`in-${transfer?.playerId || index}-${index}`}
                      title={playerName}
                      subtitle={`Signed from ${fromClub}`}
                      icon={{
                        source: Icon.ArrowRight,
                        tintColor: Color.Green,
                      }}
                      accessories={[
                        {
                          text: fromDate ? new Date(fromDate).toLocaleDateString() : "Unknown date",
                        },
                        { text: feeText },
                        ...(isLoan ? [{ text: "Loan" }] : []),
                      ]}
                    />
                  );
                })}
              </List.Section>
            )}

          {/* Outgoing Transfers */}
          {data.transfers.data.transfers.transfersOut &&
            Array.isArray(data.transfers.data.transfers.transfersOut) &&
            data.transfers.data.transfers.transfersOut.length > 0 && (
              <List.Section title="Recent Departures">
                {data.transfers.data.transfers.transfersOut.slice(0, 3).map((transfer, index) => {
                  const playerName = transfer?.name || "Unknown Player";
                  const toClub = transfer?.toClub || "Unknown Club";
                  const fromDate = transfer?.fromDate;
                  const feeText = transfer?.fee?.feeText || "Fee undisclosed";
                  const isLoan = transfer?.onLoan;

                  return (
                    <SafeListItem
                      key={`out-${transfer?.playerId || index}-${index}`}
                      title={playerName}
                      subtitle={`Sold to ${toClub}`}
                      icon={{ source: Icon.ArrowLeft, tintColor: Color.Red }}
                      accessories={[
                        {
                          text: fromDate ? new Date(fromDate).toLocaleDateString() : "Unknown date",
                        },
                        { text: feeText },
                        ...(isLoan ? [{ text: "Loan" }] : []),
                      ]}
                    />
                  );
                })}
              </List.Section>
            )}
        </>
      )}
    </List>
  );
}
