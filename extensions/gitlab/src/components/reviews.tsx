import { ActionPanel, List, OpenInBrowserAction, render, showToast, ToastStyle, Color } from "@raycast/api";
import { MergeRequest } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { gitlab } from "../common";
import { useState, useEffect } from "react";

export function ReviewList() {
  const [searchText, setSearchText] = useState<string>();
  const { mrs, error, isLoading } = useSearch(searchText);

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Reviews", error);
  }

  if (!mrs) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  return (
    <List
      searchBarPlaceholder="Filter Reviews by name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
    >
      {mrs?.map((mr) => (
        <ReviewListItem key={mr.id} mr={mr} />
      ))}
    </List>
  );
}

function ReviewListItem(props: { mr: MergeRequest }) {
  const mr = props.mr;
  return (
    <List.Item
      id={mr.id.toString()}
      title={mr.title}
      subtitle={"#" + mr.iid}
      icon={{ source: GitLabIcons.mropen, tintColor: Color.Green }}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={mr.web_url} />
        </ActionPanel>
      }
    />
  );
}

export function useSearch(query: string | undefined): {
  mrs?: MergeRequest[];
  error?: string;
  isLoading: boolean;
} {
  const [mrs, setMRs] = useState<MergeRequest[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (query === null || cancel) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const user = await gitlab.getMyself();
        const glMRs = await gitlab.getMergeRequests({
          state: "opened",
          reviewer_id: user.id,
          search: query || "",
          in: "title",
        });

        if (!cancel) {
          setMRs(glMRs);
        }
      } catch (e: any) {
        if (!cancel) {
          setError(e.message);
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return { mrs, error, isLoading };
}
