import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { BASE_API_URL } from "./constants";
import { extractCountryCode, formatCountryWithFlag } from "./utils/helpers";
import { cachedFetch } from "./utils/cache";
import ContestDetails from "./views/contest-details-view";
import ContestResultsView from "./views/contest-results-view";

interface Contest {
  year: number;
  city: string;
  countryCode?: string;
}

export default function ExploreContests() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchContests() {
      try {
        const yearsResponse = await cachedFetch(`${BASE_API_URL}/senior/contests/years`);
        const years = (await yearsResponse.json()) as number[];

        const contestsData = await Promise.all(
          years.map(async (year) => {
            const response = await cachedFetch(`${BASE_API_URL}/senior/contests/${year}`);
            const data = (await response.json()) as { city: string; countryCode?: string; country?: string };
            return {
              year,
              city: data.city,
              countryCode: extractCountryCode(data),
            };
          }),
        );

        contestsData.sort((a, b) => b.year - a.year);
        setContests(contestsData);
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch Eurovision API data" });
      } finally {
        setIsLoading(false);
      }
    }

    fetchContests();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search contest year">
      {contests.map((contest) => (
        <List.Item
          key={contest.year}
          title={contest.year.toString()}
          subtitle={formatCountryWithFlag(contest.countryCode, contest.city)}
          accessories={contest.year === 2020 ? [{ tag: { value: "Cancelled", color: Color.Red } }] : undefined}
          actions={
            <ActionPanel>
              <Action
                title="View Contest"
                icon={Icon.Info}
                onAction={() => push(<ContestDetails year={contest.year} />)}
              />
              {contest.year !== 2020 && (
                <Action
                  title={`View ${contest.year} Results`}
                  icon={Icon.BarChart}
                  onAction={() => push(<ContestResultsView year={contest.year} />)}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
