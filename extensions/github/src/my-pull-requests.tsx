import { List, Image, Icon, ActionPanel, Action, Color } from "@raycast/api";
import { Section, useSearchPullRequests } from "./graphql/useSearchPullRequests";
import moment from "moment";
import { PullRequestReviewDecision } from "./graphql/schema.generated";
import { PullRequestFieldsFragment } from "./graphql/SearchPullRequests.generated";

export default function Command() {
  const { isLoading, data } = useSearchPullRequests();

  return (
    <List isLoading={isLoading} throttle>
      {[display(data?.reviewRequested), display(data?.opened), display(data?.mentioned), display(data?.closed)]}
    </List>
  );
}

function display(section: Section | undefined | null) {
  if (section === null || section === undefined) {
    return;
  }
  return <List.Section title={section.title}>{section.requests.map((pullRequest) => item(pullRequest))}</List.Section>;
}

function item(pullRequest: PullRequestFieldsFragment) {
  const icon: Image.ImageLike = (() => {
    if (pullRequest.isMerged) {
      return {
        tooltip: `#${pullRequest.number}`,
        source: "merged.png",
        tintColor: Color.Purple,
      };
    }
    if (pullRequest.isClosed) {
      return {
        tooltip: `#${pullRequest.number}`,
        source: "closed.png",
        tintColor: Color.Red,
      };
    }
    if (pullRequest.isDraft) {
      return {
        tooltip: `#${pullRequest.number}`,
        source: "draft.png",
        tintColor: Color.SecondaryText,
      };
    }
    return {
      tooltip: `#${pullRequest.number}`,
      source: "open.png",
      tintColor: Color.Green,
    };
  })();
  const updatedDate = new Date(pullRequest.updatedDate);
  const commentsCount =
    pullRequest.comments.totalCount +
    (pullRequest.reviewThreads.nodes?.reduce((a, b) => {
      if (b !== null) {
        return a + b.comments.totalCount;
      }
      return 0;
    }, 0) ?? 0);
  const reviewDecisionLabel = (() => {
    switch (pullRequest.reviewDecision) {
      case PullRequestReviewDecision.Approved:
        return { text: "Approved" };
      case PullRequestReviewDecision.ChangesRequested:
        return { text: "Changes Requested" };
      case PullRequestReviewDecision.ReviewRequired:
        return { text: "Review Required" };
    }
    return { text: "" };
  })();
  const accessories = [
    {
      text: commentsCount > 0 ? commentsCount.toString() : null,
      icon: pullRequest.comments.totalCount > 0 ? Icon.Bubble : null,
    },
    reviewDecisionLabel,
    {
      date: updatedDate,
      tooltip: `Updated ${moment(updatedDate).format("D MMM YYYY [at] HH:mm")} `,
    },
    {
      icon: pullRequest.author?.avatarURL
        ? {
            source: pullRequest.author?.avatarURL,
            mask: Image.Mask.Circle,
          }
        : undefined,
      tooltip: `Author ${pullRequest.author?.githubUsername}`,
    },
  ];

  return (
    <List.Item
      key={pullRequest.repository.name + pullRequest.number}
      icon={icon}
      title={{
        tooltip: `#${pullRequest.number}`,
        value: `${pullRequest.title} #${pullRequest.number}`,
      }}
      subtitle={pullRequest.repository?.name}
      accessories={accessories}
      actions={
        <ActionPanel title={"#" + pullRequest.number + " in " + pullRequest.repository.name}>
          <Action.OpenInBrowser url={pullRequest.permalink}></Action.OpenInBrowser>
        </ActionPanel>
      }
    />
  );
}
