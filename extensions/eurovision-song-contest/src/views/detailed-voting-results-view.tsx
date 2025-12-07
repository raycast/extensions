import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { BASE_API_URL } from "../constants";
import {
  extractCountryCode,
  formatCountryWithFlag,
  formatRoundName,
  getCountryNameFromCode,
  isSemiFinalRound,
  matchesContestantId,
  sortRoundsByOrder,
} from "../utils/helpers";
import { cachedFetch } from "../utils/cache";
import ContestResultsView from "./contest-results-view";

interface DetailedVotingResultsViewProps {
  year: number;
  entryId: number;
  countryName: string;
  initialRound?: string | null;
}

interface Score {
  name?: string;
  points?: number;
  votes?: Record<string, number>; // Country code -> points
}

interface Performance {
  contestantId?: number | string;
  place?: number;
  scores?: Score[];
}

interface Round {
  name?: string;
  performances?: Performance[];
}

interface ContestData {
  countryCode?: string;
  country?: string;
  rounds?: Round[];
}

interface EntryData {
  countryCode?: string;
  country?: string;
}

// Big 5 countries that automatically qualify
const BIG_5_CODES = ["GB", "DE", "IT", "FR", "ES"];

export default function DetailedVotingResultsView({
  year,
  entryId,
  countryName,
  initialRound,
}: DetailedVotingResultsViewProps) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(initialRound || null);
  const [hostCountryCode, setHostCountryCode] = useState<string | undefined>(undefined);
  const [entryCountryCode, setEntryCountryCode] = useState<string | undefined>(undefined);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const previousAvailableRounds = useRef<string[]>([]);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchData() {
      try {
        const [contestResponse, entryResponse] = await Promise.all([
          cachedFetch(`${BASE_API_URL}/senior/contests/${year}`),
          cachedFetch(`${BASE_API_URL}/senior/contests/${year}/contestants/${entryId}`),
        ]);

        const contestData = (await contestResponse.json()) as ContestData;
        const entryData = (await entryResponse.json()) as EntryData;

        const hostCode = extractCountryCode(contestData);
        const entryCode = extractCountryCode(entryData);

        setHostCountryCode(hostCode);
        setEntryCountryCode(entryCode);
        setRounds(contestData.rounds || []);
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch Eurovision API data" });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [year, entryId]);

  /**
   * Determine which rounds are available for this entry
   * Big 5 and host country only show final
   * Others show semi-final (if qualified) and grand final
   */
  function getAvailableRounds(
    allRounds: Round[],
    entryCode: string | undefined,
    hostCode: string | undefined,
    entryId: number,
  ): string[] {
    if (!entryCode) return [];

    const isBig5 = BIG_5_CODES.includes(entryCode.toUpperCase());
    const isHost = entryCode.toUpperCase() === hostCode?.toUpperCase();

    // Big 5 and host only participate in final
    if (isBig5 || isHost) {
      const finalRound = allRounds.find((r) => r.name === "final");
      return finalRound ? ["final"] : [];
    }

    // For other countries, check if they qualified from Semi-Final
    const availableRounds: string[] = [];
    const finalRound = allRounds.find((r) => r.name === "final");
    const semiFinalRounds = allRounds.filter((r) => isSemiFinalRound(r.name));

    // Check if entry appears in Grand Final
    const qualified = finalRound?.performances?.some((p) => matchesContestantId(p.contestantId, entryId));

    // Helper to find which Semi-Final the entry participated in
    const findParticipatedSemiFinal = (): string | undefined => {
      for (const semiRound of semiFinalRounds) {
        const participated = semiRound.performances?.some((p) => matchesContestantId(p.contestantId, entryId));
        if (participated) {
          return semiRound.name!;
        }
      }
      return undefined;
    };

    const participatedSemiFinal = findParticipatedSemiFinal();

    // Always add final first (so it becomes the default) if qualified
    if (finalRound && qualified) {
      availableRounds.push("final");
    }

    // Add semi-final: after final if qualified, or as only round if not qualified
    if (participatedSemiFinal) {
      availableRounds.push(participatedSemiFinal);
    }

    return availableRounds;
  }

  const availableRounds = useMemo(
    () => getAvailableRounds(rounds, entryCountryCode, hostCountryCode, entryId),
    [rounds, entryCountryCode, hostCountryCode, entryId],
  );

  // Set default selected round when available rounds change
  useEffect(() => {
    if (availableRounds.length === 0) {
      previousAvailableRounds.current = [];
      return;
    }

    // Check if availableRounds actually changed
    const roundsChanged =
      previousAvailableRounds.current.length !== availableRounds.length ||
      previousAvailableRounds.current.join(",") !== availableRounds.join(",");

    // Only update if rounds changed and (no selection or current selection is invalid)
    if (roundsChanged) {
      // If initialRound was provided and is valid, use it; otherwise use first available
      const roundToSelect = initialRound && availableRounds.includes(initialRound) ? initialRound : availableRounds[0];

      if (!selectedRound || !availableRounds.includes(selectedRound)) {
        setSelectedRound(roundToSelect);
      }
      previousAvailableRounds.current = availableRounds;
    }
  }, [availableRounds, selectedRound, initialRound]);

  // Fetch performance data for selected round
  useEffect(() => {
    if (!selectedRound) return;

    const round = rounds.find((r) => r.name === selectedRound);
    if (!round?.performances) {
      setPerformance(null);
      return;
    }

    const entryPerformance = round.performances.find((p) => matchesContestantId(p.contestantId, entryId));

    setPerformance(entryPerformance || null);
  }, [selectedRound, rounds, entryId]);

  // Determine voting system based on year
  // 2016 onwards: Split televote/jury system
  // 1975-2015: Combined televote and jury points
  const hasSplitSystem = year >= 2016;

  // Calculate points from performance data
  const totalPoints = useMemo(() => {
    return performance?.scores?.find((s) => s.name === "total")?.points ?? 0;
  }, [performance]);

  const juryPoints = useMemo(() => {
    if (!hasSplitSystem) return 0;
    return performance?.scores?.find((s) => s.name === "jury")?.points ?? 0;
  }, [performance, hasSplitSystem]);

  const hasJury = useMemo(() => {
    if (!hasSplitSystem) return false;
    return performance?.scores?.some((s) => s.name === "jury") ?? false;
  }, [performance, hasSplitSystem]);

  const televotePoints = useMemo(() => {
    if (!hasSplitSystem) {
      // For combined system (1975-2015), total points = televote + jury combined
      return totalPoints;
    }

    // First try to find "public" or "televote" score
    const publicScore = performance?.scores?.find((s) => s.name === "public" || s.name === "televote");
    if (publicScore) return publicScore.points ?? 0;

    // If no separate public/televote score, use the first score (televote-only rounds)
    if (performance?.scores && performance.scores.length > 0) {
      return performance.scores[0].points ?? 0;
    }

    return 0;
  }, [performance, hasSplitSystem, totalPoints]);

  // Helper function to process votes from a score object
  const processVotes = (
    votes: Record<string, number> | undefined,
  ): Array<{ countryCode: string; countryName: string; points: number }> => {
    if (!votes) return [];

    return Object.entries(votes)
      .filter(([, points]) => points > 0)
      .map(([countryCode, points]) => ({
        countryCode,
        countryName: getCountryNameFromCode(countryCode, countryCode),
        points,
      }))
      .sort((a, b) => b.points - a.points);
  };

  const juryVotes = useMemo(() => {
    if (!hasSplitSystem) return [];
    const juryScore = performance?.scores?.find((s) => s.name === "jury");
    return processVotes(juryScore?.votes);
  }, [performance, hasSplitSystem]);

  const televoteVotes = useMemo(() => {
    if (!hasSplitSystem) {
      // For combined system (1975-2015), votes are in the "total" score
      const totalScore = performance?.scores?.find((s) => s.name === "total");
      return processVotes(totalScore?.votes);
    }

    // First try to find "public" or "televote" score
    let televoteScore = performance?.scores?.find((s) => s.name === "public" || s.name === "televote");

    // If no separate public/televote score, use the first score (televote-only rounds)
    if (!televoteScore && performance?.scores && performance.scores.length > 0) {
      televoteScore = performance.scores[0];
    }

    return processVotes(televoteScore?.votes);
  }, [performance, hasSplitSystem]);

  const sortedRounds = sortRoundsByOrder(
    availableRounds.map((name) => rounds.find((r) => r.name === name)).filter((r): r is Round => r !== undefined),
  );

  // Check if no votes are available
  const hasNoVotes = juryVotes.length === 0 && televoteVotes.length === 0;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${countryName} - ${year} Voting Results`}
      searchBarAccessory={
        sortedRounds.length > 1 ? (
          <List.Dropdown
            tooltip="Select Round"
            value={selectedRound || ""}
            onChange={(newValue) => setSelectedRound(newValue)}
          >
            {sortedRounds.map((round) => (
              <List.Dropdown.Item key={round.name} title={formatRoundName(round.name!)} value={round.name!} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {hasNoVotes ? (
        <List.Item
          title={`No detailed voting results from ${year} were made available by the EBU`}
          actions={
            <ActionPanel>
              <Action
                title={`View ${year} Results`}
                icon={Icon.BarChart}
                onAction={() => push(<ContestResultsView year={year} />)}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Item
            title={`Total points: ${totalPoints}`}
            actions={
              <ActionPanel>
                <Action
                  title={`View ${year} Results`}
                  icon={Icon.BarChart}
                  onAction={() => push(<ContestResultsView year={year} />)}
                />
              </ActionPanel>
            }
          />
          {hasSplitSystem ? (
            // 2016 onwards: Split system with jury and televote
            hasJury ? (
              <>
                <List.Section title={`Jury points: ${juryPoints}`}>
                  {juryVotes.length > 0 ? (
                    juryVotes.map((vote, index) => (
                      <List.Item
                        key={`jury-${index}`}
                        title={formatCountryWithFlag(vote.countryCode, vote.countryName)}
                        accessories={[{ text: `${vote.points} points` }]}
                      />
                    ))
                  ) : (
                    <List.Item title="No jury votes received" />
                  )}
                </List.Section>
                <List.Section title={`Televote points: ${televotePoints}`}>
                  {televoteVotes.length > 0 ? (
                    televoteVotes.map((vote, index) => (
                      <List.Item
                        key={`televote-${index}`}
                        title={formatCountryWithFlag(vote.countryCode, vote.countryName)}
                        accessories={[{ text: `${vote.points} points` }]}
                      />
                    ))
                  ) : (
                    <List.Item title="No televote points received" />
                  )}
                </List.Section>
              </>
            ) : (
              <List.Section title={`Televote points: ${televotePoints}`}>
                {televoteVotes.length > 0 ? (
                  televoteVotes.map((vote, index) => (
                    <List.Item
                      key={`televote-${index}`}
                      title={formatCountryWithFlag(vote.countryCode, vote.countryName)}
                      accessories={[{ text: `${vote.points} points` }]}
                    />
                  ))
                ) : (
                  <List.Item title="No televote points received" />
                )}
              </List.Section>
            )
          ) : (
            // 1956-2015: Combined system/Jury only in some years
            <List.Section title="Points from countries">
              {televoteVotes.length > 0 ? (
                televoteVotes.map((vote, index) => (
                  <List.Item
                    key={`vote-${index}`}
                    title={formatCountryWithFlag(vote.countryCode, vote.countryName)}
                    accessories={[{ text: `${vote.points} points` }]}
                  />
                ))
              ) : (
                <List.Item title="No points received" />
              )}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
