import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { BASE_API_URL } from "../constants";
import {
  extractCountryCode,
  formatCountryWithFlag,
  formatRoundName,
  getCountryNameFromCode,
  getPlaceEmoji,
  sortRoundsByOrder,
} from "../utils/helpers";
import { cachedFetch } from "../utils/cache";
import EntryDetails from "./entry-details-view";
import DetailedVotingResultsView from "./detailed-voting-results-view";

interface ContestResultsViewProps {
  year: number;
}

interface Score {
  name?: string;
  points?: number;
}

interface Round {
  name?: string;
  performances?: Array<{
    contestantId?: number | string;
    place?: number;
    scores?: Score[];
  }>;
}

interface ResultEntry {
  place: number;
  entryId: number;
  countryCode?: string;
  countryName: string;
  artist: string;
  song: string;
  points?: number;
}

export default function ContestResultsView({ year }: ContestResultsViewProps) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchRounds() {
      try {
        const response = await cachedFetch(`${BASE_API_URL}/senior/contests/${year}`);
        const data = (await response.json()) as { rounds?: Round[] };
        const roundsData = data.rounds || [];
        setRounds(roundsData);

        // Set default selected round to final if available, otherwise first round
        if (roundsData.length > 0) {
          const finalRound = roundsData.find((r) => r.name === "final");
          setSelectedRound(finalRound?.name || roundsData[0].name || null);
        }
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch Eurovision API data" });
      } finally {
        setIsLoading(false);
      }
    }

    fetchRounds();
  }, [year]);

  useEffect(() => {
    if (!selectedRound || year === 2020) {
      setResults([]);
      return;
    }

    async function fetchResults() {
      setIsLoadingResults(true);
      try {
        const round = rounds.find((r) => r.name === selectedRound);
        if (!round?.performances) {
          setResults([]);
          return;
        }

        const resultsData = await Promise.all(
          round.performances
            .filter((p) => p.contestantId !== undefined && p.place !== undefined)
            .map(async (performance) => {
              try {
                const entryResponse = await cachedFetch(
                  `${BASE_API_URL}/senior/contests/${year}/contestants/${performance.contestantId}`,
                );
                const entryData = (await entryResponse.json()) as {
                  artist: string;
                  song: string;
                  country?: string;
                  countryCode?: string;
                };

                const countryCode = extractCountryCode(entryData);
                const countryName = getCountryNameFromCode(countryCode, entryData.country);
                const totalPoints = performance.scores?.find((s) => s.name === "total")?.points;

                return {
                  place: performance.place!,
                  entryId: Number(performance.contestantId),
                  countryCode,
                  countryName,
                  artist: entryData.artist,
                  song: entryData.song,
                  points: totalPoints,
                } as ResultEntry;
              } catch (error) {
                showFailureToast(error, {
                  title: `Failed to fetch entry data for contestant ${performance.contestantId}`,
                });
                return null;
              }
            }),
        );

        const validResults = resultsData.filter((r): r is ResultEntry => r !== null).sort((a, b) => a.place - b.place);
        setResults(validResults);
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch results" });
        setResults([]);
      } finally {
        setIsLoadingResults(false);
      }
    }

    fetchResults();
  }, [selectedRound, rounds, year]);

  const availableRounds = sortRoundsByOrder(rounds);

  const searchPlaceholder = selectedRound
    ? `Search ${year} ${formatRoundName(selectedRound)} results...`
    : `Search ${year} results...`;

  return (
    <List
      isLoading={isLoading || isLoadingResults}
      navigationTitle={`Eurovision ${year} Results`}
      searchBarPlaceholder={searchPlaceholder}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Round"
          value={selectedRound || ""}
          onChange={(newValue) => setSelectedRound(newValue)}
        >
          {availableRounds.map((round) => (
            <List.Dropdown.Item key={round.name} title={formatRoundName(round.name!)} value={round.name!} />
          ))}
        </List.Dropdown>
      }
    >
      {results.map((result) => {
        const isSemiFinal = selectedRound !== "final" && selectedRound !== null;
        const qualified = result.place <= 10;
        const placeEmoji = selectedRound === "final" ? getPlaceEmoji(result.place) : "";
        const accessories: Array<{ text: string } | { tag: { value: string; color: Color } }> = [];

        if (result.points !== undefined) accessories.push({ text: `${result.points} points` });
        if (isSemiFinal) {
          accessories.push({
            tag: { value: qualified ? "Qualified" : "Failed to Qualify", color: qualified ? Color.Green : Color.Red },
          });
        }

        return (
          <List.Item
            key={result.entryId}
            title={`${placeEmoji}${result.place}. ${formatCountryWithFlag(result.countryCode, result.countryName)}`}
            subtitle={`${result.artist} - "${result.song}"`}
            accessories={accessories.length > 0 ? accessories : undefined}
            actions={
              <ActionPanel>
                <Action
                  title="View Entry"
                  icon={Icon.Info}
                  onAction={() => push(<EntryDetails year={year} entryId={result.entryId} />)}
                />
                <Action
                  title="View Detailed Voting Results"
                  icon={Icon.BarChart}
                  onAction={() =>
                    push(
                      <DetailedVotingResultsView
                        year={year}
                        entryId={result.entryId}
                        countryName={result.countryName}
                        initialRound={selectedRound}
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
