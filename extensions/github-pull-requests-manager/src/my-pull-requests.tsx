import { List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { fetchMyPRsCategorized } from "./github/my-prs";
import { fetchReviewRequestsCategorized } from "./github/reviewing";
import { PullRequestItem } from "./components/PullRequestItem";
import { Preferences } from "./components/types";

export default function Command() {
  const { githubEnterpriseUrl, githubToken, filterLabel } = getPreferenceValues<Preferences>();
  const args = [githubEnterpriseUrl, githubToken, filterLabel] as const;
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const {
    data: categorized,
    isLoading: l1,
    revalidate: r1,
    error: e1,
  } = useCachedPromise(fetchMyPRsCategorized, [...args]);
  const {
    data: reviewRequests,
    isLoading: l2,
    revalidate: r2,
    error: e2,
  } = useCachedPromise(fetchReviewRequestsCategorized, [githubEnterpriseUrl, githubToken]);

  const isLoading = l1 || l2;
  const error = e1 ?? e2;

  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to load pull requests", message: error.message });
  }

  const prefs = { githubEnterpriseUrl, githubToken };
  const toggleDetail = () => setIsShowingDetail((s) => !s);
  const revalidate = () => {
    r1();
    r2();
  };
  const show = (cat: string) => selectedCategory === "all" || selectedCategory === cat;

  const allEmpty =
    categorized &&
    reviewRequests &&
    categorized.waitForMerge.length === 0 &&
    categorized.waitForChange.length === 0 &&
    categorized.waitForReview.length === 0 &&
    categorized.parked.length === 0 &&
    reviewRequests.pending.length === 0 &&
    reviewRequests.inReview.length === 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Filter pull requests..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by category" onChange={setSelectedCategory}>
          <List.Dropdown.Item title="All Categories" value="all" />
          <List.Dropdown.Section title="My PRs">
            <List.Dropdown.Item title="⏳ Wait For Merge" value="wait-for-merge" />
            <List.Dropdown.Item title="🔴 Wait For Change" value="wait-for-change" />
            <List.Dropdown.Item title="👀 Wait For Review" value="wait-for-review" />
            <List.Dropdown.Item title="⏸ Parked" value="parked" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Reviewing">
            <List.Dropdown.Item title="💬 In Review" value="in-review" />
            <List.Dropdown.Item title="🔔 New Review Request" value="new-review-request" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {allEmpty && <List.EmptyView title="All Clear" description="No open pull requests or review requests." />}
      {show("wait-for-merge") && categorized && (
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
      )}
      {show("wait-for-change") && categorized && (
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
      )}
      {show("wait-for-review") && categorized && (
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
      )}
      {show("parked") && categorized && categorized.parked.length > 0 && (
        <List.Section title="⏸ Parked" subtitle={`${categorized.parked.length}`}>
          {categorized.parked.map((pr) => (
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
      )}
      {show("in-review") && reviewRequests && (
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
      )}
      {show("new-review-request") && reviewRequests && (
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
      )}
    </List>
  );
}
