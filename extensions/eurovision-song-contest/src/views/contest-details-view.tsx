import { Action, ActionPanel, Detail, Icon, open, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { BASE_API_URL } from "../constants";
import {
  extractCountryCode,
  formatCountryWithFlag,
  formatRoundName,
  getCountryNameFromCode,
  sortRoundsByOrder,
} from "../utils/helpers";
import { cachedFetch } from "../utils/cache";
import ExploreEntriesView from "./explore-entries-view";
import EntryDetails from "./entry-details-view";
import ContestResultsView from "./contest-results-view";

interface ContestDetailsProps {
  year: number;
}

interface Score {
  name?: string;
  points?: number;
}

interface Performance {
  contestantId?: number | string;
  place?: number;
  scores?: Score[];
}

interface Round {
  name?: string;
  performances?: Performance[];
  date?: string;
  dateTime?: string;
}

interface ContestData {
  logoUrl?: string;
  slogan?: string;
  city: string;
  country: string;
  countryCode?: string;
  arena?: string;
  broadcasters?: string[];
  contestants?: Array<{ id: number; country: string; countryCode?: string }>;
  presenters?: string[];
  rounds?: Round[];
  intendedCountry?: string;
}

interface WinnerInfo {
  countryCode?: string;
  countryName: string;
  song: string;
  entryId: number;
}

export default function ContestDetails({ year }: ContestDetailsProps) {
  const [contestData, setContestData] = useState<ContestData | null>(null);
  const [winnerInfo, setWinnerInfo] = useState<WinnerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchContestData() {
      try {
        const response = await cachedFetch(`${BASE_API_URL}/senior/contests/${year}`);
        const data = (await response.json()) as {
          logoUrl?: string;
          slogan?: string;
          city: string;
          country: string;
          countryCode?: string;
          arena?: string;
          broadcasters?: string[];
          contestants?: Array<{ id: number; country: string; countryCode?: string }>;
          presenters?: string[];
          rounds?: Round[];
          intendedCountry?: string;
        };
        setContestData({ ...data, countryCode: extractCountryCode(data) });

        // Fetch winner information if not 2020
        if (year !== 2020 && data.rounds) {
          const finalRound = data.rounds.find((round) => round.name === "final");
          const winner = finalRound?.performances?.find((p) => p.place === 1);

          if (winner && winner.contestantId !== undefined) {
            try {
              const entryResponse = await cachedFetch(
                `${BASE_API_URL}/senior/contests/${year}/contestants/${winner.contestantId}`,
              );
              const entryData = (await entryResponse.json()) as {
                song: string;
                country?: string;
                countryCode?: string;
              };

              const winnerCountryCode = extractCountryCode(entryData);
              const winnerCountryName = getCountryNameFromCode(winnerCountryCode, entryData.country);

              if (entryData.song) {
                setWinnerInfo({
                  countryCode: winnerCountryCode,
                  countryName: winnerCountryName,
                  song: entryData.song,
                  entryId: Number(winner.contestantId),
                });
              }
            } catch (error) {
              showFailureToast(error, { title: "Failed to fetch winner entry data" });
            }
          }
        }
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch Eurovision API data" });
      } finally {
        setIsLoading(false);
      }
    }

    fetchContestData();
  }, [year]);

  const formatRoundDate = (dateStr: string | undefined): string | null => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return `${date.getDate()} ${date.toLocaleString("en-US", { month: "long" })} ${date.getFullYear()}`;
    } catch {
      return null;
    }
  };

  const markdown = useMemo(
    () => (contestData?.logoUrl ? `<img src="${contestData.logoUrl}" height="320" />` : ""),
    [contestData?.logoUrl],
  );
  const navigationTitle = useMemo(() => `Eurovision Song Contest ${year}`, [year]);

  const roundsWithDates = useMemo(() => {
    if (year === 2020 || !contestData?.rounds) return [];
    return sortRoundsByOrder(contestData.rounds.filter((round) => round.name && (round.date || round.dateTime)))
      .map((round) => {
        const formattedDate = formatRoundDate(round.date || round.dateTime);
        return formattedDate ? { roundName: formatRoundName(round.name!), formattedDate } : null;
      })
      .filter((item): item is { roundName: string; formattedDate: string } => item !== null);
  }, [contestData?.rounds, year]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action
            title={`View ${year} Entries`}
            icon={Icon.List}
            onAction={() => push(<ExploreEntriesView initialYear={year} />)}
          />
          {year !== 2020 && (
            <Action
              title={`View ${year} Results`}
              icon={Icon.BarChart}
              onAction={() => push(<ContestResultsView year={year} />)}
            />
          )}
          {winnerInfo && (
            <Action
              title="View Winning Song"
              icon={Icon.Trophy}
              onAction={() => push(<EntryDetails year={year} entryId={winnerInfo.entryId} />)}
            />
          )}
          <Action
            title="Open Wikipedia"
            icon={Icon.Globe}
            onAction={() => {
              const url = `https://en.wikipedia.org/wiki/Eurovision_Song_Contest_${year}`;
              open(url);
            }}
          />
        </ActionPanel>
      }
      metadata={
        contestData && (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Host City"
              text={formatCountryWithFlag(contestData.countryCode, contestData.city)}
            />
            {contestData.slogan && <Detail.Metadata.Label title="Slogan" text={contestData.slogan} />}
            {contestData.arena && <Detail.Metadata.Label title="Arena" text={contestData.arena} />}
            <Detail.Metadata.Separator />
            {contestData.contestants && contestData.contestants.length > 0 && (
              <Detail.Metadata.Label
                title="Participating Countries"
                text={`${contestData.contestants.length} ${contestData.contestants.length === 1 ? "participant" : "participants"}`}
              />
            )}
            {winnerInfo && (
              <Detail.Metadata.Label
                title="Winning Song"
                text={`${formatCountryWithFlag(winnerInfo.countryCode, winnerInfo.countryName)} - "${winnerInfo.song}"`}
              />
            )}
            {year === 2020 ? (
              <Detail.Metadata.TagList title="Dates">
                <Detail.Metadata.TagList.Item text="Cancelled due to pandemic" />
              </Detail.Metadata.TagList>
            ) : roundsWithDates.length > 0 ? (
              <Detail.Metadata.TagList title="Dates">
                {roundsWithDates.map((item, index) => (
                  <Detail.Metadata.TagList.Item key={index} text={`${item.roundName}: ${item.formattedDate}`} />
                ))}
              </Detail.Metadata.TagList>
            ) : null}
            {contestData.presenters && contestData.presenters.length > 0 && (
              <Detail.Metadata.TagList title="Presenters">
                {contestData.presenters.map((presenter, index) => (
                  <Detail.Metadata.TagList.Item key={index} text={presenter} />
                ))}
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Separator />
            {contestData.broadcasters && contestData.broadcasters.length > 0 && (
              <Detail.Metadata.Label
                title="Broadcaster"
                text={
                  contestData.intendedCountry
                    ? `${contestData.broadcasters.join(", ")} on behalf of ${getCountryNameFromCode(contestData.intendedCountry, contestData.intendedCountry)}`
                    : contestData.broadcasters.join(", ")
                }
              />
            )}
          </Detail.Metadata>
        )
      }
    />
  );
}
