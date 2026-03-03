import Repository from "@/components/Repository";
import { SEARCH_REPOSITORIES, GET_REPOSITORIES } from "@/queries/repositories";
import { SearchRepositories, GetUserRepositories, RepositoryOwnProps } from "@/types";
import { fetcher } from "@/utils";
import { List, popToRoot, showToast, Toast } from "@raycast/api";
import { debounce } from "debounce";
import { useState } from "react";
import useSWR from "swr";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<RepositoryOwnProps[] | null>(null);
  const { data } = useSWR<GetUserRepositories>("repositories-recent", () => fetcher({ document: GET_REPOSITORIES }), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const searchRepositories = debounce(async (query: string) => {
    // Exit early if there is no query
    if (!query) {
      setResults(null);
      return;
    }

    // Display loading while holding onto previous results
    setIsLoading(true);

    try {
      const { search }: SearchRepositories = await fetcher({
        document: SEARCH_REPOSITORIES,
        variables: {
          query,
        },
      });

      setResults(search.nodes);
    } catch (err: any) {
      popToRoot();
      showToast({
        style: Toast.Style.Failure,
        title: "Could not get repositories",
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, 500);

  return (
    <List
      isLoading={!data || isLoading}
      searchBarPlaceholder="Globally search repositories"
      onSearchTextChange={searchRepositories}
    >
      <List.Section
        title="Repositories"
        subtitle={
          data?.user.repositories.nodes?.length === 1
            ? "1 repository"
            : `${data?.user.repositories.nodes?.length || 0} repositories`
        }
      >
        {results
          ? results.map((item) => <Repository key={item.id} {...item} />)
          : data?.user.repositories.nodes?.map((item) => <Repository key={item.id} {...item} />)}
      </List.Section>
    </List>
  );
}
