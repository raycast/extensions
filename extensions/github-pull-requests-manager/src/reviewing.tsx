import { List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { fetchReviewRequestsCategorized } from "./github/reviewing";
import { PullRequestItem } from "./components/PullRequestItem";

export default function Command() {
  const { githubEnterpriseUrl, githubToken, filterLabel } = getPreferenceValues();
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const {
    data: reviewRequests,
    isLoading,
    revalidate,
    error,
  } = useCachedPromise(fetchReviewRequestsCategorized, [githubEnterpriseUrl, githubToken, filterLabel]);

  useEffect(() => {
    if (error) showToast({ style: Toast.Style.Failure, title: "Failed to load pull requests", message: error.message });
  }, [error]);

  const prefs = { githubEnterpriseUrl, githubToken };
  const toggleDetail = () => setIsShowingDetail((s) => !s);

  const isEmpty =
    reviewRequests &&
    reviewRequests.pending.length === 0 &&
    reviewRequests.inReview.length === 0 &&
    reviewRequests.incoming.length === 0;

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Filter pull requests...">
      {isEmpty && <List.EmptyView title="No Review Requests" description="You have no pending review requests." />}
      {reviewRequests && (
        <>
          <List.Section title="🔔 New Review Request" subtitle={`${reviewRequests.pending.length}`}>
            {reviewRequests.pending.map((pr) => (
              <PullRequestItem
                key={pr.id}
                pr={pr}
                category="new-review-request"
                onRevalidate={revalidate}
                preferences={prefs}
                onToggleDetail={toggleDetail}
              />
            ))}
          </List.Section>
          <List.Section title="💬 In Review" subtitle={`${reviewRequests.inReview.length}`}>
            {reviewRequests.inReview.map(({ pr, activity }) => (
              <PullRequestItem
                key={pr.id}
                pr={pr}
                category="in-review"
                myActivity={activity}
                onRevalidate={revalidate}
                preferences={prefs}
                onToggleDetail={toggleDetail}
              />
            ))}
          </List.Section>
          {reviewRequests.incoming.length > 0 && (
            <List.Section title="📥 Incoming" subtitle={`${reviewRequests.incoming.length}`}>
              {reviewRequests.incoming.map((pr) => (
                <PullRequestItem
                  key={pr.id}
                  pr={pr}
                  category="incoming"
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
