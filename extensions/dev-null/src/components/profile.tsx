import { countOf, showError } from "@chrismessina/raycast-kit";
import { logger } from "@chrismessina/raycast-logger";
import { useState, type ReactNode } from "react";
import { Action, ActionPanel, environment, Icon, Image, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getConnections, getUser, getUserCommits, type Commit, type User } from "../lib/api";

const log = (message: string, data?: Record<string, unknown>) => logger.log(message, data);

const avatar = (user: User): Image.ImageLike =>
  user.avatar_url ? { source: user.avatar_url, mask: Image.Mask.Circle } : Icon.PersonCircle;

const date = (iso: string | undefined) => (iso ? new Date(iso) : undefined);

/**
 * Whether a view shows its detail pane, remembered per command and view, and the action on every row that flips it
 * (⌘⇧D). Raycast's cache is shared by every command, so the key names the command.
 */
export function useSidebar(view: string): { show: boolean; action: ReactNode } {
  const [show, setShow] = useCachedState<boolean>(`show-detail-${environment.entryPointName}-${view}`, true);
  const action = (
    <Action
      title={show ? "Hide Sidebar" : "Show Sidebar"}
      icon={Icon.AppWindowSidebarRight}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      onAction={() => setShow((current) => !current)}
    />
  );
  return { show, action };
}

function commitMarkdown(commit: Commit): string {
  const parts = [commit.body];
  for (const image of commit.images ?? []) parts.push(`![${image.description ?? ""}](${image.url})`);
  const preview = commit.link_preview;
  if (preview) parts.push(`[${preview.title ?? preview.url}](${preview.url})`);
  return parts.join("\n\n");
}

export function CommitItem({
  commit,
  showAuthor,
  sidebarAction,
}: {
  commit: Commit;
  showAuthor: boolean;
  sidebarAction: ReactNode;
}) {
  const { author } = commit;
  return (
    <List.Item
      icon={showAuthor ? avatar(author) : commit.parent_id ? Icon.Reply : Icon.Message}
      title={commit.body}
      accessories={[{ date: date(commit.created_at) }]}
      detail={
        <List.Item.Detail
          markdown={commitMarkdown(commit)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Link title="Author" text={`@${author.username}`} target={author.html_url} />
              <List.Item.Detail.Metadata.Label
                title="Posted"
                text={date(commit.created_at)?.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              />
              {commit.stars_count !== undefined && (
                <List.Item.Detail.Metadata.Label title="Stars" icon={Icon.Star} text={String(commit.stars_count)} />
              )}
              {commit.replies_count !== undefined && (
                <List.Item.Detail.Metadata.Label
                  title="Replies"
                  icon={Icon.Reply}
                  text={String(commit.replies_count)}
                />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Commit" url={commit.html_url} />
          {showAuthor && (
            <Action.Push
              icon={Icon.PersonCircle}
              title={`View @${author.username}`}
              target={<Profile username={author.username} />}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Commit URL"
            content={commit.html_url}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard title="Copy Commit Text" content={commit.body} />
          {sidebarAction}
        </ActionPanel>
      }
    />
  );
}

export function UserItem({ user }: { user: User }) {
  return (
    <List.Item
      icon={avatar(user)}
      title={user.name || user.username}
      subtitle={`@${user.username}`}
      // The filter searches titles and keywords, not subtitles, so a handle finds its person.
      keywords={[user.username]}
      accessories={user.bio ? [{ text: user.bio }] : undefined}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.PersonCircle} title="View Profile" target={<Profile username={user.username} />} />
          <Action.OpenInBrowser title="Open Profile in Browser" url={user.html_url} />
          <Action.CopyToClipboard
            title="Copy Profile URL"
            content={user.html_url}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}

/** Who follows a user, or whom they follow. */
function Connections({ username, kind }: { username: string; kind: "followers" | "following" }) {
  const { data, isLoading, pagination } = useCachedPromise(
    (name: string, which: typeof kind) =>
      ({ cursor }: { cursor?: string }) =>
        getConnections(name, which, cursor, log),
    [username, kind],
    { onError: (error) => void showError(error, { title: "Couldn't Load People" }) },
  );
  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={kind === "followers" ? `@${username}'s Followers` : `Followed by @${username}`}
      searchBarPlaceholder="Filter people"
    >
      {data?.map((user) => (
        <UserItem key={user.username} user={user} />
      ))}
    </List>
  );
}

function ProfileDetail({ user }: { user: User }) {
  const header = user.avatar_url ? `![](${user.avatar_url}?raycast-width=96&raycast-height=96)\n\n` : "";
  return (
    <List.Item.Detail
      markdown={`${header}## ${user.name || user.username}\n\n${user.bio ?? ""}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Username" text={`@${user.username}`} />
          {user.company && <List.Item.Detail.Metadata.Label title="Company" text={user.company} />}
          {user.location && <List.Item.Detail.Metadata.Label title="Location" text={user.location} />}
          {user.website && <List.Item.Detail.Metadata.Link title="Website" text={user.website} target={user.website} />}
          <List.Item.Detail.Metadata.Link
            title="GitHub"
            text={`github.com/${user.username}`}
            target={`https://github.com/${user.username}`}
          />
          {user.created_at && (
            <List.Item.Detail.Metadata.Label
              title="Joined"
              text={new Date(user.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
            />
          )}
          {user.commits_count !== undefined && (
            <List.Item.Detail.Metadata.Label title="Commits" text={String(user.commits_count)} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function ProfileSection({ user, sidebarAction }: { user: User; sidebarAction: ReactNode }) {
  const profileActions = (
    <>
      <Action.OpenInBrowser title="Open Profile in Browser" url={user.html_url} />
      <Action.CopyToClipboard
        title="Copy Profile URL"
        content={user.html_url}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      {sidebarAction}
    </>
  );
  const connection = (kind: "followers" | "following", count: number | undefined) => (
    <List.Item
      icon={kind === "followers" ? Icon.TwoPeople : Icon.AddPerson}
      title={kind === "followers" ? "Followers" : "Following"}
      accessories={count === undefined ? undefined : [{ text: String(count) }]}
      detail={
        <List.Item.Detail
          markdown={
            count === undefined
              ? ""
              : kind === "followers"
                ? `${countOf(count, "person", { plural: "people", zero: "No one" })} ${count > 1 ? "follow" : "follows"} @${user.username}.`
                : `@${user.username} follows ${countOf(count, "person", { plural: "people", zero: "no one" })}.`
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.List}
            title={kind === "followers" ? "Show Followers" : "Show Following"}
            target={<Connections username={user.username} kind={kind} />}
          />
          {profileActions}
        </ActionPanel>
      }
    />
  );
  return (
    <List.Section title="Profile">
      <List.Item
        icon={avatar(user)}
        title={user.name || user.username}
        subtitle={`@${user.username}`}
        detail={<ProfileDetail user={user} />}
        actions={<ActionPanel>{profileActions}</ActionPanel>}
      />
      {connection("followers", user.followers_count)}
      {connection("following", user.following_count)}
    </List.Section>
  );
}

/**
 * A user's commits, or their replies, newest first. As a profile, the commits come under the person and their
 * followers; on its own, it is the list of commits alone.
 */
export function Profile({
  username,
  commitsOnly = false,
  navigationTitle,
}: {
  username: string;
  commitsOnly?: boolean;
  navigationTitle?: string;
}) {
  const [show, setShow] = useState<"commits" | "replies">("commits");
  const sidebar = useSidebar("profile");
  const user = useCachedPromise((name: string) => getUser(name, log), [username], {
    onError: (error) => void showError(error, { title: "Couldn't Load Profile" }),
  });
  const commits = useCachedPromise(
    (name: string, replies: boolean) =>
      ({ cursor }: { cursor?: string }) =>
        getUserCommits(name, { cursor, replies }, log),
    [username, show === "replies"],
    {
      // The profile is fetched first, so a missing user gets one error rather than two.
      execute: user.data !== undefined,
      onError: (error) => void showError(error, { title: "Couldn't Load Commits" }),
    },
  );

  return (
    <List
      isLoading={user.isLoading || commits.isLoading}
      isShowingDetail={!user.error && sidebar.show}
      pagination={commits.pagination}
      navigationTitle={navigationTitle ?? `@${username}`}
      searchBarPlaceholder={show === "replies" ? "Filter replies" : "Filter commits"}
      searchBarAccessory={
        <List.Dropdown tooltip="Show" value={show} onChange={(value) => setShow(value as typeof show)}>
          <List.Dropdown.Item icon={Icon.Message} title="Commits" value="commits" />
          <List.Dropdown.Item icon={Icon.Reply} title="Replies" value="replies" />
        </List.Dropdown>
      }
    >
      {user.error ? (
        <List.EmptyView icon={Icon.PersonCircle} title={user.error.message} />
      ) : (
        <>
          {!commitsOnly && user.data && <ProfileSection user={user.data} sidebarAction={sidebar.action} />}
          <List.Section title={show === "replies" ? "Replies" : "Commits"}>
            {commits.data?.map((commit) => (
              <CommitItem key={commit.id} commit={commit} showAuthor={false} sidebarAction={sidebar.action} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
