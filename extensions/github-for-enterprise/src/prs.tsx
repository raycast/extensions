import PRTemplate from "@/components/PullRequest";
import { GET_PRS } from "@/queries/pull-requests";
import { GetPullRequests } from "@/types";
import { fetcher, partition, plural } from "@/utils";
import { List, popToRoot, showToast, Toast } from "@raycast/api";
import Fuse from "fuse.js";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

export default function Command() {
  const { data, error } = useSWR<GetPullRequests>("prs", () => fetcher({ document: GET_PRS }), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const [searchText, setSearchText] = useState<string>("");
  const [open, recentlyClosed] = useMemo(
    () => partition(data?.user.pullRequests.nodes || [], ({ state }) => /OPEN/.test(state)),
    [data],
  );

  const fuseOpen = useMemo(
    () =>
      new Fuse(open || [], {
        threshold: 0.2,
        ignoreLocation: true,
        keys: ["title", "number", "repository.nameWithOwner"],
      }),
    [open],
  );

  const fuseRecentlyClosed = useMemo(
    () =>
      new Fuse(recentlyClosed || [], {
        threshold: 0.2,
        ignoreLocation: true,
        keys: ["title", "number", "repository.nameWithOwner"],
      }),
    [recentlyClosed],
  );

  const searchOpen = useCallback(
    (str: string) => {
      if (!str) {
        return open.map((item, index: number) => ({
          item,
          score: 1,
          refIndex: index,
        }));
      }

      return fuseOpen.search(str);
    },
    [open],
  );

  const searchRecentlyClosed = useCallback(
    (str: string) => {
      if (!str) {
        return recentlyClosed.map((item, index: number) => ({
          item,
          score: 1,
          refIndex: index,
        }));
      }

      return fuseRecentlyClosed.search(str);
    },
    [recentlyClosed],
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
      {data && searchOpen(searchText)?.length > 0 && (
        <List.Section title="Open" subtitle={plural(searchOpen(searchText)?.length, "pull request")}>
          {searchOpen(searchText).map(({ item }) => (
            <PRTemplate key={item.id} {...item} />
          ))}
        </List.Section>
      )}
      {data && searchRecentlyClosed(searchText)?.length > 0 && (
        <List.Section
          title="Recently Closed"
          subtitle={plural(searchRecentlyClosed(searchText)?.length, "pull request")}
        >
          {searchRecentlyClosed(searchText).map(({ item }) => (
            <PRTemplate key={item.id} {...item} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
