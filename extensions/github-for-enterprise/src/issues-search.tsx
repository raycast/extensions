import IssueTemplate, { IssueOwnProps } from "@/components/Issue";
import { RECENT_ISSUES, SEARCH_ISSUES } from "@/queries/issues";
import { GetIssues } from "@/types";
import { fetcher, plural } from "@/utils";
import { List, popToRoot, showToast, Toast } from "@raycast/api";
import { debounce } from "debounce";
import { useState } from "react";
import useSWR from "swr";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<IssueOwnProps[] | null>(null);
  const { data } = useSWR<GetIssues>("issues-recent", () => fetcher({ document: RECENT_ISSUES }), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const searchIssues = debounce(async (query: string) => {
    // Exit early if there is no query
    if (!query) {
      setResults(null);
      return;
    }

    // Display loading while holding onto previous results
    setIsLoading(true);

    try {
      const { search } = await fetcher({
        document: SEARCH_ISSUES,
        variables: {
          query: `is:issue ${query}`,
        },
      });

      setResults(search.nodes);
    } catch (err: any) {
      popToRoot();
      showToast({
        style: Toast.Style.Failure,
        title: "Could not get issues",
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, 500);

  return (
    <List
      isLoading={!data || isLoading}
      searchBarPlaceholder="Globally search issues across repositories"
      onSearchTextChange={searchIssues}
    >
      <List.Section title="Issues" subtitle={plural(data?.user.issues.nodes?.length, "issue")}>
        {results
          ? results.map((item) => <IssueTemplate key={item.id} {...item} />)
          : data?.user.issues.nodes?.map((item) => <IssueTemplate key={item.id} {...item} />)}
      </List.Section>
    </List>
  );
}
