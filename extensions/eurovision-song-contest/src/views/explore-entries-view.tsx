import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { BASE_API_URL } from "../constants";
import { extractCountryCode, formatCountryWithFlag, getCountryNameFromCode, getPlaceEmoji } from "../utils/helpers";
import { cachedFetch } from "../utils/cache";
import EntryDetails from "./entry-details-view";
import ContestResultsView from "./contest-results-view";
import DetailedVotingResultsView from "./detailed-voting-results-view";

interface Entry {
  id: number;
  country: string;
  countryCode?: string;
  artist: string;
  song: string;
  place?: number;
}

interface Performance {
  contestantId?: number | string;
  place?: number;
}

interface Round {
  name?: string;
  performances?: Performance[];
}

interface ExploreEntriesViewProps {
  initialYear?: number;
}

export default function ExploreEntriesView({ initialYear }: ExploreEntriesViewProps) {
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(initialYear || null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoadingYears, setIsLoadingYears] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchYears() {
      try {
        const response = await cachedFetch(`${BASE_API_URL}/senior/contests/years`);
        const yearsData = (await response.json()) as number[];
        const sortedYears = yearsData.sort((a, b) => b - a);
        setYears(sortedYears);
        if (initialYear && sortedYears.includes(initialYear)) {
          setSelectedYear(initialYear);
        } else if (sortedYears.length > 0) {
          setSelectedYear(sortedYears[0]);
        }
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch Eurovision API data" });
      } finally {
        setIsLoadingYears(false);
      }
    }

    fetchYears();
  }, [initialYear]);

  useEffect(() => {
    if (!selectedYear) return;

    async function fetchEntries() {
      setIsLoadingEntries(true);
      try {
        const response = await cachedFetch(`${BASE_API_URL}/senior/contests/${selectedYear}`);
        const data = (await response.json()) as { contestants?: Entry[]; rounds?: Round[] };
        const finalRound = data.rounds?.find((round) => round.name === "final");
        const placeMap = new Map<string, number>();

        finalRound?.performances?.forEach((performance) => {
          if (performance.contestantId !== undefined && performance.place !== undefined) {
            placeMap.set(String(performance.contestantId), performance.place);
          }
        });

        const sortedEntries = (data.contestants || [])
          .map((entry) => ({ ...entry, place: placeMap.get(String(entry.id)) }))
          .sort((a, b) => a.country.localeCompare(b.country));
        setEntries(sortedEntries);
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch Eurovision API data" });
        setEntries([]);
      } finally {
        setIsLoadingEntries(false);
      }
    }

    fetchEntries();
  }, [selectedYear]);

  const navigationTitle = useMemo(
    () => (selectedYear ? `Eurovision ${selectedYear} Entries` : "Eurovision Entries"),
    [selectedYear],
  );

  return (
    <List
      isLoading={isLoadingYears || isLoadingEntries}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search for entry or country..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Year"
          value={selectedYear?.toString() || ""}
          onChange={(newValue) => setSelectedYear(parseInt(newValue))}
        >
          {years.map((year) => (
            <List.Dropdown.Item key={year} title={year.toString()} value={year.toString()} />
          ))}
        </List.Dropdown>
      }
    >
      {entries.map((entry) => {
        const code = extractCountryCode(entry);
        const countryName = getCountryNameFromCode(code, entry.country);
        const placeEmoji = entry.place ? getPlaceEmoji(entry.place) : "";

        return (
          <List.Item
            key={entry.id}
            title={`${placeEmoji}${entry.artist} - "${entry.song}"`}
            subtitle={formatCountryWithFlag(code, countryName)}
            keywords={[countryName, entry.country]}
            actions={
              <ActionPanel>
                <Action
                  title="View Entry"
                  icon={Icon.Info}
                  onAction={() => selectedYear && push(<EntryDetails year={selectedYear} entryId={entry.id} />)}
                />
                {selectedYear && selectedYear !== 2020 && (
                  <>
                    <Action
                      title={`View ${selectedYear} Results`}
                      icon={Icon.BarChart}
                      onAction={() => push(<ContestResultsView year={selectedYear} />)}
                    />
                    <Action
                      title={`View Detailed Voting Results for ${countryName}`}
                      icon={Icon.BarChart}
                      onAction={() =>
                        push(
                          <DetailedVotingResultsView
                            year={selectedYear}
                            entryId={entry.id}
                            countryName={countryName}
                          />,
                        )
                      }
                    />
                  </>
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
