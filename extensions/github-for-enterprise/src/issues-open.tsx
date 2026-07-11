import IssueTemplate from "@/components/Issue";
import { GET_OPEN_ISSUES } from "@/queries/issues";
import { GetIssues } from "@/types";
import { fetcher, plural } from "@/utils";
import { List, popToRoot, showToast, Toast } from "@raycast/api";
import Fuse from "fuse.js";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

export default function Command() {
  const { data, error } = useSWR<GetIssues>("issues", () => fetcher({ document: GET_OPEN_ISSUES }), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const [searchText, setSearchText] = useState<string>("");
  const fuseIssues = useMemo(
    () =>
      new Fuse(data?.user.issues.nodes || [], {
        threshold: 0.2,
        ignoreLocation: true,
        keys: ["title", "number", "repository.nameWithOwner"],
      }),
    [data],
  );

  const searchIssues = useCallback(
    (str: string) => {
      if (!str) {
        return data?.user.issues.nodes?.map((item, index: number) => ({
          item,
          score: 1,
          refIndex: index,
        }));
      }

      return fuseIssues.search(str);
    },
    [data],
  );

  if (error) {
    popToRoot();
    showToast({
      style: Toast.Style.Failure,
      title: "Could not get issues",
      message: error.message,
    });
  }

  return (
    <List
      isLoading={!data}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search issues by name or number..."
    >
      <List.Section title="Issues" subtitle={plural(searchIssues(searchText)?.length, "issue")}>
        {data && searchIssues(searchText)?.map(({ item }) => <IssueTemplate key={item.id} {...item} />)}
      </List.Section>
    </List>
  );
}
