import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { showErrorToast } from "../lib/error-toast";
import { compactCount, formatDay, profileLink, profileMarkdown } from "../lib/format";
import { Profile } from "../lib/schemas";
import { fetchProfile } from "../lib/users";
import { CreateMonitorForm } from "./create-monitor-form";
import { ErrorScreen } from "./error-view";
import { PostFeedList } from "./post-feed-list";

type ProfileScreenProps = {
  user: string;
  navigationTitle?: string;
};

type ProfileDetailProps = {
  profile?: Profile;
  isLoading?: boolean;
  navigationTitle?: string;
};

export function ProfileScreen({ user, navigationTitle }: ProfileScreenProps) {
  const { data, error, isLoading, revalidate } = useCachedPromise(fetchProfile, [user], {
    onError: (failure) => {
      showErrorToast(failure, revalidate);
    },
  });
  if (error && !data && !isLoading) return <ErrorScreen error={error} onRetry={revalidate} />;
  return <ProfileDetail profile={data} isLoading={isLoading} navigationTitle={navigationTitle} />;
}

export function ProfileDetail({ profile, isLoading, navigationTitle }: ProfileDetailProps) {
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      markdown={profile && profileMarkdown(profile)}
      metadata={profile && <ProfileMetadata profile={profile} />}
      actions={profile && <ProfileActions profile={profile} />}
    />
  );
}

function ProfileMetadata({ profile }: { profile: Profile }) {
  const { Metadata } = Detail;
  const { followers, following, statusesCount, createdAt, location, url, contactInfo } = profile;
  const links = contactInfo?.links?.filter((link) => link.url !== url) ?? [];
  const counts = [
    { title: "Followers", count: followers },
    { title: "Following", count: following },
    { title: "Posts", count: statusesCount },
  ];
  return (
    <Metadata>
      {counts.map(({ title, count }) =>
        typeof count === "number" ? <Metadata.Label key={title} title={title} text={compactCount(count)} /> : null,
      )}
      {createdAt && <Metadata.Label title="Joined" text={formatDay(createdAt)} />}
      {location && <Metadata.Label title="Location" text={location} />}
      {url && <Metadata.Link title="Website" target={url} text={url} />}
      {links.map((link) => (
        <Metadata.Link key={link.url} title="Link" target={link.url} text={link.url} />
      ))}
      {contactInfo?.emails?.map((email) => (
        <Metadata.Link key={email.value} title="Email" target={`mailto:${email.value}`} text={email.value} />
      ))}
    </Metadata>
  );
}

function ProfileActions({ profile }: { profile: Profile }) {
  const { username } = profile;
  const link = profileLink(username);
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={link} />
      <Action.Push
        title="View Posts"
        icon={Icon.List}
        target={<PostFeedList feed={{ kind: "userPosts", user: username }} navigationTitle={`@${username}`} />}
      />
      <Action.Push
        title="View Mentions"
        icon={Icon.Bubble}
        target={<PostFeedList feed={{ kind: "mentions", user: username }} navigationTitle={`@${username}`} />}
      />
      <Action.CopyToClipboard title="Copy Username" content={username} shortcut={Keyboard.Shortcut.Common.Copy} />
      <Action.CopyToClipboard title="Copy Profile Link" content={link} shortcut={Keyboard.Shortcut.Common.CopyPath} />
      <Action.Push
        title="Create Monitor"
        icon={Icon.Bell}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<CreateMonitorForm kind="account" target={username} />}
      />
    </ActionPanel>
  );
}
