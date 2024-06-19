import { List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format, formatDistanceToNow } from "date-fns";

import { PullRequestFieldsFragment, UserFieldsFragment } from "../generated/graphql";
import { getEmojiFromReactionContent, getReducedReactions } from "../helpers/pull-request";
import { getGitHubUser } from "../helpers/users";
import { useMyPullRequests } from "../hooks/useMyPullRequests";

import PullRequestActions from "./PullRequestActions";

export type PullRequestCommentsProps = {
  pullRequest: PullRequestFieldsFragment;
  viewer?: UserFieldsFragment;
  mutateList?: MutatePromise<PullRequestFieldsFragment[] | undefined> | ReturnType<typeof useMyPullRequests>["mutate"];
};

export const PullRequestComments = ({ pullRequest, viewer, mutateList }: PullRequestCommentsProps) => {
  return (
    <List isShowingDetail>
      {pullRequest.comments.nodes ? (
        pullRequest.comments.nodes
          .filter((c) => c !== null)
          .sort((a, b) => new Date(b!.createdAt).valueOf() - new Date(a!.createdAt).valueOf())
          .map((comment) => {
            if (!comment) {
              return null;
            }

            const author = getGitHubUser(comment.author).text;
            const icon = getGitHubUser(comment.author).icon;

            return (
              <List.Item
                key={comment.id}
                title={author}
                icon={icon}
                actions={<PullRequestActions pullRequest={pullRequest} mutateList={mutateList} viewer={viewer} />}
                subtitle={formatDistanceToNow(new Date(comment?.createdAt).valueOf(), { addSuffix: true })}
                detail={
                  <List.Item.Detail
                    markdown={comment.body}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title={"Author"} text={author} icon={icon} />
                        <List.Item.Detail.Metadata.Label
                          title={"Date & Time"}
                          text={format(new Date(comment.createdAt).valueOf(), "EEEE d MMMM yyyy 'at' HH:mm")}
                        />

                        {comment.reactions.nodes && comment.reactions.nodes.length > 0 && (
                          <List.Item.Detail.Metadata.TagList title="Reactions">
                            {Object.keys(getReducedReactions(comment.reactions.nodes)).map((reaction) => (
                              <List.Item.Detail.Metadata.TagList.Item
                                key={reaction}
                                text={`${getEmojiFromReactionContent(reaction)} ${
                                  getReducedReactions(comment.reactions.nodes)[reaction]
                                }`}
                              />
                            ))}
                          </List.Item.Detail.Metadata.TagList>
                        )}
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Link
                          title={"Pull request"}
                          text={"View Pull request"}
                          target={pullRequest.permalink}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
              />
            );
          })
      ) : (
        <List.EmptyView title="Pull Request Not Found" />
      )}
    </List>
  );
};

export default PullRequestComments;
