import { ActionPanel, List, OpenInBrowserAction, showToast, ToastStyle, Color } from "@raycast/api";
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

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    async function fetchData() {
      if (query === null || didUnmount) {
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
          scope: "all",
        });

        if (!didUnmount) {
          setMRs(glMRs);
        }
      } catch (e: any) {
        if (!didUnmount) {
          setError(e.message);
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [query]);

  return { mrs, error, isLoading };
}
