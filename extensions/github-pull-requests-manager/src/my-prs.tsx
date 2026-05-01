import { List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { fetchMyPRsCategorized } from "./github/my-prs";
import { PullRequestItem } from "./components/PullRequestItem";

export default function Command() {
  const { githubEnterpriseUrl, githubToken, filterLabel } = getPreferenceValues();
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const {
    data: categorized,
    isLoading,
    revalidate,
    error,
  } = useCachedPromise(fetchMyPRsCategorized, [githubEnterpriseUrl, githubToken, filterLabel]);

  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to load pull requests", message: error.message });
  }

  const prefs = { githubEnterpriseUrl, githubToken };
  const toggleDetail = () => setIsShowingDetail((s) => !s);

  const isEmpty =
    categorized &&
    categorized.waitForMerge.length === 0 &&
    categorized.waitForChange.length === 0 &&
    categorized.waitForReview.length === 0 &&
    categorized.parked.length === 0;

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Filter pull requests...">
      {isEmpty && <List.EmptyView title="No Pull Requests" description="You have no open pull requests." />}
      {categorized && (
        <>
          <List.Section title="⏳ Wait For Merge" subtitle={`${categorized.waitForMerge.length}`}>
            {categorized.waitForMerge.map((pr) => (
              <PullRequestItem
                key={pr.id}
                pr={pr}
                category="wait-for-merge"
                onRevalidate={revalidate}
                preferences={prefs}
                onToggleDetail={toggleDetail}
              />
            ))}
          </List.Section>
          <List.Section title="🔴 Wait For Change" subtitle={`${categorized.waitForChange.length}`}>
            {categorized.waitForChange.map((pr) => (
              <PullRequestItem
                key={pr.id}
                pr={pr}
                category="wait-for-change"
                onRevalidate={revalidate}
                preferences={prefs}
                onToggleDetail={toggleDetail}
              />
            ))}
          </List.Section>
          <List.Section title="👀 Wait For Review" subtitle={`${categorized.waitForReview.length}`}>
            {categorized.waitForReview.map((pr) => (
              <PullRequestItem
                key={pr.id}
                pr={pr}
                category="wait-for-review"
                onRevalidate={revalidate}
                preferences={prefs}
                onToggleDetail={toggleDetail}
              />
            ))}
          </List.Section>
          {categorized.parked.length > 0 && (
            <List.Section title="⏸ Parked" subtitle={`${categorized.parked.length}`}>
              {categorized.parked.map((pr) => (
                <PullRequestItem
                  key={pr.id}
                  pr={pr}
                  category="parked"
                  onRevalidate={revalidate}
                  preferences={prefs}
                  onToggleDetail={toggleDetail}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
