import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { BASE_API_URL } from "./constants";
import { extractCountryCode, formatCountryWithFlag, getCountryNameFromCode } from "./utils/helpers";
import { cachedFetch } from "./utils/cache";
import EntryDetails from "./views/entry-details-view";
import CountryWinnersView from "./views/country-winners-view";

type ViewMode = "by-country" | "by-year";

interface Winner {
  year: number;
  countryCode?: string;
  countryName: string;
  song: string;
  artist: string;
  entryId: number;
}

interface CountryWinCount {
  countryCode?: string;
  countryName: string;
  winCount: number;
}

interface Performance {
  contestantId?: number | string;
  place?: number;
}

interface Round {
  name?: string;
  performances?: Performance[];
}

interface ContestData {
  rounds?: Round[];
  contestants?: Array<{ id: number; country: string; countryCode?: string }>;
}

interface EntryData {
  artist: string;
  song: string;
  country?: string;
  countryCode?: string;
}

export default function WinsLeaderboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("by-country");
  const [winners, setWinners] = useState<Winner[]>([]);
  const [allWinners, setAllWinners] = useState<Winner[]>([]);
  const [countryWinCounts, setCountryWinCounts] = useState<CountryWinCount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchWinners() {
      setIsLoading(true);
      try {
        // Fetch all years
        const yearsResponse = await cachedFetch(`${BASE_API_URL}/senior/contests/years`);
        const years = (await yearsResponse.json()) as number[];

        // Fetch winners for each year
        const winnersDataArrays = await Promise.all(
          years.map(async (year) => {
            try {
              const contestResponse = await cachedFetch(`${BASE_API_URL}/senior/contests/${year}`);
              const contestData = (await contestResponse.json()) as ContestData;

              // Get all winners (performances with place === 1 - necessary for 1969 with 4-way tie split)
              const firstRound = contestData.rounds?.[0];
              const winningPerformances = firstRound?.performances?.filter((p) => p.place === 1) || [];

              if (winningPerformances.length === 0) return [];

              const yearWinners = await Promise.all(
                winningPerformances.map(async (performance) => {
                  if (performance.contestantId === undefined) return null;

                  const contestant = contestData.contestants?.find(
                    (c) => c.id === performance.contestantId || String(c.id) === String(performance.contestantId),
                  );
                  if (!contestant) return null;

                  const entryId = contestant.id;
                  const entryResponse = await cachedFetch(
                    `${BASE_API_URL}/senior/contests/${year}/contestants/${entryId}`,
                  );
                  const entryData = (await entryResponse.json()) as EntryData;

                  if (!entryData.song || !entryData.artist) return null;

                  const countryCode = extractCountryCode(contestant);
                  return {
                    year,
                    countryCode,
                    countryName: getCountryNameFromCode(countryCode, contestant.country),
                    song: entryData.song,
                    artist: entryData.artist,
                    entryId,
                  } as Winner;
                }),
              );

              return yearWinners.filter((w): w is Winner => w !== null);
            } catch (error) {
              showFailureToast(error, { title: `Failed to fetch winner for year ${year}` });
              return [];
            }
          }),
        );

        const allWinnersData = winnersDataArrays.flat().sort((a, b) => b.year - a.year);
        setAllWinners(allWinnersData);

        if (viewMode === "by-year") {
          setWinners(allWinnersData);
        } else {
          const winCountMap = new Map<string, { countryCode?: string; countryName: string; count: number }>();

          allWinnersData.forEach((winner) => {
            const key = winner.countryCode || winner.countryName;
            const existing = winCountMap.get(key);
            if (existing) {
              existing.count++;
            } else {
              winCountMap.set(key, {
                countryCode: winner.countryCode,
                countryName: winner.countryName,
                count: 1,
              });
            }
          });

          const counts: CountryWinCount[] = Array.from(winCountMap.values())
            .map((item) => ({
              countryCode: item.countryCode,
              countryName: item.countryName,
              winCount: item.count,
            }))
            .sort((a, b) => b.winCount - a.winCount);
          setCountryWinCounts(counts);
        }
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch Eurovision API data" });
        setWinners([]);
        setCountryWinCounts([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWinners();
  }, [viewMode]);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select View"
          value={viewMode}
          onChange={(newValue) => setViewMode(newValue as ViewMode)}
        >
          <List.Dropdown.Item title="Wins by Country" value="by-country" />
          <List.Dropdown.Item title="Winners by Year" value="by-year" />
        </List.Dropdown>
      }
    >
      {viewMode === "by-year" &&
        winners.map((winner) => (
          <List.Item
            key={`${winner.year}-${winner.entryId}`}
            title={`${winner.year} ${formatCountryWithFlag(winner.countryCode, winner.countryName)}`}
            subtitle={`${winner.song} - ${winner.artist}`}
            actions={
              <ActionPanel>
                <Action
                  title="View Entry Details"
                  icon={Icon.Info}
                  onAction={() => push(<EntryDetails year={winner.year} entryId={winner.entryId} />)}
                />
              </ActionPanel>
            }
          />
        ))}
      {viewMode === "by-country" &&
        (() => {
          const maxWins = countryWinCounts[0]?.winCount ?? 0;
          return countryWinCounts.map((country) => {
            const isTopWinner = country.winCount === maxWins && maxWins > 0;
            const countryWinners = allWinners.filter(
              (w) => w.countryCode === country.countryCode || w.countryName === country.countryName,
            );
            const winText = country.winCount === 1 ? "1 win" : `${country.winCount} wins`;

            return (
              <List.Item
                key={country.countryCode || country.countryName}
                title={formatCountryWithFlag(country.countryCode, country.countryName)}
                accessories={
                  isTopWinner
                    ? [{ icon: Icon.Trophy }, { tag: { value: winText, color: Color.Yellow } }]
                    : [{ icon: Icon.Trophy, text: winText }]
                }
                actions={
                  <ActionPanel>
                    <Action
                      title={`View All ${country.countryName} Wins`}
                      icon={Icon.List}
                      onAction={() =>
                        push(
                          <CountryWinnersView
                            countryCode={country.countryCode}
                            countryName={country.countryName}
                            winners={countryWinners}
                          />,
                        )
                      }
                    />
                  </ActionPanel>
                }
              />
            );
          });
        })()}
    </List>
  );
}
