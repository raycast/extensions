import { List, Image, Icon, ActionPanel, Action } from "@raycast/api";
import { useSearchPullRequests } from "./graphql/useSearchPullRequests";
import moment from "moment";
import { PullRequestReviewDecision } from "./graphql/schema.generated";

export default function Command() {
  const { isLoading, data } = useSearchPullRequests();

  return (
    <List isLoading={isLoading} throttle>
      {data?.map((section) => {
        return (
          <List.Section title={section.title}>
            {section.requests.map((pr) => {
              const icon = (() => {
                if (pr.isMerged) {
                  return { source: "merged.png" };
                }
                if (pr.isClosed) {
                  return { source: "closed.png" };
                }
                if (pr.isDraft) {
                  return { source: "draft.png" };
                }
                return { source: "open.png" };
              })();
              const updatedDate = new Date(pr.updatedDate);
              const commentsCount =
                pr.comments.totalCount +
                (pr.reviewThreads.nodes?.reduce((a, b) => {
                  if (b !== null) {
                    return a + b.comments.totalCount;
                  }
                  return 0;
                }, 0) ?? 0);
              const reviewDecisionLabel = (() => {
                switch (pr.reviewDecision) {
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
                  icon: pr.comments.totalCount > 0 ? Icon.Bubble : null,
                },
                reviewDecisionLabel,
                {
                  date: updatedDate,
                  tooltip: `Updated ${moment(updatedDate).format(
                    "D MMM YYYY [at] HH:mm"
                  )} `,
                },
                {
                  icon: pr.author?.avatarURL
                    ? {
                        source: pr.author?.avatarURL,
                        mask: Image.Mask.Circle,
                      }
                    : undefined,
                  tooltip: `Author ${pr.author?.githubUsername}`,
                },
              ];

              return (
                <List.Item
                  key={pr.number}
                  icon={icon}
                  title={pr.title + " " + "#" + pr.number}
                  subtitle={pr.repository?.name}
                  accessories={accessories}
                  actions={
                    <ActionPanel
                      title={"#" + pr.number + " in " + pr.repository.name}
                    >
                      <Action.OpenInBrowser
                        url={pr.permalink}
                      ></Action.OpenInBrowser>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
