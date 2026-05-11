import { Action, ActionPanel, Color, Detail, Icon, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { BASE_API_URL } from "../constants";
import {
  extractCountryCode,
  formatCountryWithFlag,
  formatRoundName,
  getCountryNameFromCode,
  matchesContestantId,
} from "../utils/helpers";
import { cachedFetch } from "../utils/cache";
import ContestDetails from "./contest-details-view";

interface EntryDetailsProps {
  year: number;
  entryId: number;
}

interface Lyric {
  type: number;
  content?: string;
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
}

interface EntryData {
  artist: string;
  song: string;
  country?: string;
  countryCode?: string;
  videoUrls?: string[];
  composers?: string[];
  writers?: string[];
  lyrics?: Lyric[];
}

interface PlaceWithRound {
  place: number;
  roundName: string;
  points?: number;
}

interface ResultWithColor {
  text: string;
  color?: Color;
}

const getOrdinal = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatPointsText = (points?: number): string => (points !== undefined ? ` (${points} points)` : "");

const getFinalColor = (place: number): Color | undefined =>
  ({ 1: Color.Yellow, 2: Color.SecondaryText, 3: Color.Orange })[place];

const getSemiFinalColor = (place: number): Color | undefined =>
  place >= 11 ? Color.Red : place <= 10 ? Color.Green : undefined;

const convertToYoutubeUrl = (url: string): string =>
  url.replace(/youtube-nocookie\.com/g, "youtube.com").replace(/\/embed\/([^/?]+)/, "/watch?v=$1");

export default function EntryDetails({ year, entryId }: EntryDetailsProps) {
  const [entryData, setEntryData] = useState<EntryData | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchData() {
      try {
        const [entryResponse, contestResponse] = await Promise.all([
          cachedFetch(`${BASE_API_URL}/senior/contests/${year}/contestants/${entryId}`),
          cachedFetch(`${BASE_API_URL}/senior/contests/${year}`),
        ]);

        const entryData = (await entryResponse.json()) as EntryData;
        const contestData = (await contestResponse.json()) as { rounds?: Round[] };

        setEntryData(entryData);
        setRounds(contestData.rounds || []);
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch Eurovision API data" });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [year, entryId]);

  const countryCode = useMemo(() => (entryData ? extractCountryCode(entryData) : undefined), [entryData]);
  const countryName = useMemo(
    () => getCountryNameFromCode(countryCode, entryData?.country),
    [countryCode, entryData?.country],
  );

  const markdown = useMemo(
    () => entryData?.lyrics?.find((lyric) => lyric.type === 0)?.content?.replace(/\n/g, "  \n") || "",
    [entryData],
  );

  const navigationTitle = useMemo(
    () => (entryData ? `"${entryData.song}" - ${countryName}` : "Entry Details"),
    [entryData, countryName],
  );

  const metadata = useMemo(() => {
    if (!entryData) return null;

    const unique = Array.from(new Set([...(entryData.composers || []), ...(entryData.writers || [])]));
    const placesWithRounds: PlaceWithRound[] = rounds.flatMap((round) =>
      (round.performances || [])
        .filter((p) => matchesContestantId(p.contestantId, entryId) && p.place !== undefined)
        .map((p) => ({
          place: p.place!,
          roundName: round.name || "",
          points: p.scores?.find((s) => s.name === "total")?.points,
        })),
    );

    const finalResult = placesWithRounds.find((r) => r.roundName === "final");
    const semiFinalResults = placesWithRounds.filter(
      (r) => r.roundName === "semifinal1" || r.roundName === "semifinal2",
    );

    const resultsWithColor: ResultWithColor[] = [
      ...(finalResult
        ? [
            {
              text: `${getOrdinal(finalResult.place)} in ${formatRoundName(finalResult.roundName)}${formatPointsText(finalResult.points)}`,
              color: getFinalColor(finalResult.place),
            },
          ]
        : []),
      ...semiFinalResults.map((result) => ({
        text: `${getOrdinal(result.place)} in ${formatRoundName(result.roundName)}${formatPointsText(result.points)}`,
        color: getSemiFinalColor(result.place),
      })),
    ];

    return (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Country" text={formatCountryWithFlag(countryCode, countryName)} />
        <Detail.Metadata.Label title="Song" text={entryData.song} />
        <Detail.Metadata.Label title="Artist" text={entryData.artist} />
        {resultsWithColor.length > 0 && (
          <Detail.Metadata.TagList title="Results">
            {resultsWithColor.map((result, index) => (
              <Detail.Metadata.TagList.Item key={index} text={result.text} color={result.color} />
            ))}
          </Detail.Metadata.TagList>
        )}
        {resultsWithColor.length > 0 && <Detail.Metadata.Separator />}
        {entryData.videoUrls?.[0] && (
          <Detail.Metadata.Link
            title="Performance"
            target={convertToYoutubeUrl(entryData.videoUrls[0])}
            text="Watch Video"
          />
        )}
        {unique.length > 0 && (
          <Detail.Metadata.TagList title="Music & Lyrics">
            {unique.map((person, index) => (
              <Detail.Metadata.TagList.Item key={index} text={person} />
            ))}
          </Detail.Metadata.TagList>
        )}
      </Detail.Metadata>
    );
  }, [entryData, countryCode, countryName, rounds, entryId]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={navigationTitle}
      metadata={metadata}
      actions={
        <ActionPanel>
          <Action
            title={`View ${year} Contest`}
            icon={Icon.Calendar}
            onAction={() => push(<ContestDetails year={year} />)}
          />
        </ActionPanel>
      }
    />
  );
}
