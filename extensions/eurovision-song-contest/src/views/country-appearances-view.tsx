import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { BASE_API_URL } from "../constants";
import { extractCountryCode, formatCountryWithFlag } from "../utils/helpers";
import { cachedFetch } from "../utils/cache";
import EntryDetails from "./entry-details-view";
import ContestDetails from "./contest-details-view";
import ExploreEntriesView from "./explore-entries-view";

interface CountryAppearancesViewProps {
  countryCode?: string;
  countryName: string;
}

interface Entry {
  id: number;
  country: string;
  countryCode?: string;
  artist: string;
  song: string;
}

interface Appearance {
  year: number;
  artist: string;
  song: string;
  entryId: number;
}

export default function CountryAppearancesView({ countryCode, countryName }: CountryAppearancesViewProps) {
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchAppearances() {
      try {
        const yearsResponse = await cachedFetch(`${BASE_API_URL}/senior/contests/years`);
        const years = (await yearsResponse.json()) as number[];

        const appearancesData = await Promise.all(
          years.map(async (year) => {
            try {
              const response = await cachedFetch(`${BASE_API_URL}/senior/contests/${year}`);
              const data = (await response.json()) as { contestants?: Entry[] };
              const contestants = data.contestants || [];

              const entry = contestants.find((c) => {
                const entryCountryCode = extractCountryCode(c);
                return (
                  entryCountryCode?.toUpperCase() === countryCode?.toUpperCase() ||
                  entryCountryCode?.toUpperCase() === countryName.toUpperCase()
                );
              });

              return entry ? { year, artist: entry.artist, song: entry.song, entryId: entry.id } : null;
            } catch (error) {
              showFailureToast(error, { title: `Failed to fetch contestants for year ${year}` });
              return null;
            }
          }),
        );

        const validAppearances = appearancesData
          .filter((a): a is Appearance => a !== null)
          .sort((a, b) => b.year - a.year);
        setAppearances(validAppearances);
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch Eurovision API data" });
      } finally {
        setIsLoading(false);
      }
    }

    fetchAppearances();
  }, [countryCode, countryName]);

  return (
    <List isLoading={isLoading} navigationTitle={`${formatCountryWithFlag(countryCode, countryName)} Appearances`}>
      {appearances.map((appearance) => (
        <List.Item
          key={appearance.year}
          title={appearance.year.toString()}
          subtitle={`${appearance.artist} - "${appearance.song}"`}
          actions={
            <ActionPanel>
              <Action
                title="View Entry Details"
                icon={Icon.Info}
                onAction={() => push(<EntryDetails year={appearance.year} entryId={appearance.entryId} />)}
              />
              <Action
                title={`View ${appearance.year} Contest`}
                icon={Icon.Calendar}
                onAction={() => push(<ContestDetails year={appearance.year} />)}
              />
              <Action
                title={`View ${appearance.year} Entries`}
                icon={Icon.List}
                onAction={() => push(<ExploreEntriesView initialYear={appearance.year} />)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
