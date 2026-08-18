import { Action, ActionPanel, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { api, authHeaders, deleteProfileComment, normalizeList, profileCommentReply } from "../lib/postproxy";
import { formatDate } from "../lib/format";
import type { ProfileComment } from "../lib/types";
import { ReplyForm } from "./ReplyForm";

function reviewMarkdown(review: ProfileComment): string {
  const lines = [`**${review.author_username ?? "Reviewer"}**`, "", review.body || "_(no text)_"];
  if (review.replies && review.replies.length > 0) {
    lines.push("", "---", "**Your reply**");
    for (const reply of review.replies) lines.push("", `> ${reply.body}`);
  }
  return lines.join("\n");
}

/** Google Business reviews for a profile: browse, reply, and delete your replies. */
export function ProfileCommentsView({ profileId, profileName }: { profileId: string; profileName?: string }) {
  const { data, isLoading, revalidate } = useFetch(api(`/profiles/${profileId}/comments?per_page=50`), {
    headers: authHeaders(),
    mapResult: (result: unknown) => ({ data: normalizeList<ProfileComment>(result) }),
    initialData: [] as ProfileComment[],
  });

  async function run(label: string, action: () => Promise<unknown>) {
    try {
      await action();
      await showToast({ style: Toast.Style.Success, title: label });
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: `${label} failed` });
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={profileName ? `${profileName} — Reviews` : "Reviews"}
      searchBarPlaceholder="Search reviews…"
    >
      {data.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Star}
          title="No reviews"
          description="No Google Business reviews for this profile yet."
        />
      ) : (
        data.map((review) => {
          const hasReply = (review.replies?.length ?? 0) > 0;
          return (
            <List.Item
              key={review.id}
              icon={review.author_avatar_url ? { source: review.author_avatar_url } : Icon.Person}
              title={review.author_username ?? "Reviewer"}
              subtitle={review.body}
              accessories={[
                ...(hasReply ? [{ icon: { source: Icon.Reply, tintColor: Color.Green }, tooltip: "Replied" }] : []),
                { date: new Date(review.posted_at ?? review.created_at) },
              ]}
              detail={
                <List.Item.Detail
                  markdown={reviewMarkdown(review)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Reviewer" text={review.author_username ?? "—"} />
                      <List.Item.Detail.Metadata.Label title="Replied" text={hasReply ? "Yes" : "No"} />
                      <List.Item.Detail.Metadata.Label
                        title="Posted"
                        text={formatDate(review.posted_at ?? review.created_at)}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title={hasReply ? "Edit Reply" : "Reply"}
                    icon={Icon.Reply}
                    target={
                      <ReplyForm
                        title={hasReply ? "Edit Reply" : "Reply to Review"}
                        placeholder="Write your response…"
                        submitTitle="Send Reply"
                        onSend={(text) => profileCommentReply(profileId, review.id, text)}
                        onDone={revalidate}
                      />
                    }
                  />
                  {hasReply ? (
                    <Action
                      title="Delete Reply"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        const ok = await confirmAlert({
                          title: "Delete your reply?",
                          message: "This cannot be undone.",
                        });
                        if (ok && review.replies?.[0]) {
                          run("Deleted", () => deleteProfileComment(profileId, review.replies![0].id));
                        }
                      }}
                    />
                  ) : null}
                  {review.permalink ? (
                    <Action.OpenInBrowser title="Open Review on Platform" url={review.permalink} />
                  ) : null}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
