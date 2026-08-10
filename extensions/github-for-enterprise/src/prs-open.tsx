import PRTemplate from "@/components/PullRequest";
import { GET_OPEN_PRS } from "@/queries/pull-requests";
import { GetPullRequests } from "@/types";
import { fetcher, plural } from "@/utils";
import { List, popToRoot, showToast, Toast } from "@raycast/api";
import Fuse from "fuse.js";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

export default function Command() {
  const { data, error } = useSWR<GetPullRequests>("prs-open", () => fetcher({ document: GET_OPEN_PRS }), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const [searchText, setSearchText] = useState<string>("");
  const fusePRs = useMemo(
    () =>
      new Fuse(data?.user.pullRequests.nodes || [], {
        threshold: 0.2,
        ignoreLocation: true,
        keys: ["title", "number", "repository.nameWithOwner"],
      }),
    [data],
  );

  const searchPRs = useCallback(
    (str: string) => {
      if (!str) {
        return data?.user.pullRequests.nodes?.map((item: any, index: number) => ({
          item,
          score: 1,
          refIndex: index,
        }));
      }

      return fusePRs.search(str);
    },
    [data],
  );

  if (error) {
    popToRoot();
    showToast({
      style: Toast.Style.Failure,
      title: "Could not get pull requests",
      message: error.message,
    });
  }

  return (
    <List
      isLoading={!data}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search pull requests by name or number..."
    >
      <List.Section title="Pull Requests" subtitle={plural(searchPRs(searchText)?.length, "pull request")}>
        {data && searchPRs(searchText)?.map(({ item }) => <PRTemplate key={item.id} {...item} />)}
      </List.Section>
    </List>
  );
}
