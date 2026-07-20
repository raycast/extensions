/**
 * Profile command for viewing user profile and account information.
 */

import { Action, ActionPanel, Detail, List, Icon, Color } from "@raycast/api";
import { useBunqSession, withSessionRefresh } from "./hooks/useBunqSession";
import {
  getUserProfile,
  getUsers,
  getTreeProgress,
  UserPerson,
  UserCompany,
  BunqUser,
  CombinedTreeProgress,
} from "./api/endpoints";
import { usePromise } from "@raycast/utils";
import { ErrorView } from "./components";
import { getErrorMessage } from "./lib/errors";
import { copyToClipboard } from "./lib/actions";
import { requireUserId } from "./lib/session-guard";

function formatAddress(
  address?: {
    street?: string | null;
    house_number?: string | null;
    postal_code?: string | null;
    city?: string | null;
    country?: string | null;
  } | null,
): string {
  if (!address) return "Not set";
  const parts = [address.street, address.house_number, address.postal_code, address.city, address.country].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(", ") : "Not set";
}

function UserProfileDetail({
  user,
  session,
  treeProgress,
}: {
  user: UserPerson | UserCompany;
  session: ReturnType<typeof useBunqSession>;
  treeProgress?: CombinedTreeProgress | null;
}) {
  const isPerson = "first_name" in user;

  const name = isPerson
    ? `${(user as UserPerson).first_name || ""} ${(user as UserPerson).last_name || ""}`.trim()
    : (user as UserCompany).name || "Unknown";

  const markdown = `# ${name}

${user.public_nick_name ? `**Public nickname:** ${user.public_nick_name}` : ""}

---

## Profile Information

${isPerson ? `- **Date of birth:** ${(user as UserPerson).date_of_birth || "Not set"}` : ""}
${isPerson ? `- **Place of birth:** ${(user as UserPerson).place_of_birth || "Not set"}` : ""}
${isPerson ? `- **Gender:** ${(user as UserPerson).gender || "Not set"}` : ""}
${!isPerson ? `- **Chamber of Commerce:** ${(user as UserCompany).chamber_of_commerce_number || "Not set"}` : ""}
${user.language ? `- **Language:** ${user.language}` : ""}
${user.region ? `- **Region:** ${user.region}` : ""}

## Contact

${
  user.alias
    ?.filter((a) => a.type === "EMAIL")
    .map((a) => `- **Email:** ${a.value}`)
    .join("\n") || ""
}
${
  user.alias
    ?.filter((a) => a.type === "PHONE_NUMBER")
    .map((a) => `- **Phone:** ${a.value}`)
    .join("\n") || ""
}

## Address

${formatAddress(user.address_main as Parameters<typeof formatAddress>[0])}
${
  treeProgress
    ? `
---

## Environmental Impact

- **Total Trees Planted:** ${treeProgress.total_trees}
- **From Card Purchases:** ${treeProgress.card_trees}
- **From Referrals:** ${treeProgress.referral_trees}
- **From Rewards:** ${treeProgress.reward_trees}
${treeProgress.progress_to_next !== null ? `- **Progress to Next Tree:** ${Math.round(treeProgress.progress_to_next * 100)}%` : ""}
`
    : ""
}`;

  return (
    <Detail
      navigationTitle={name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="User ID" text={user.id?.toString() || "Unknown"} />
          <Detail.Metadata.Label title="Display Name" text={user.display_name || name} />
          {user.public_nick_name && <Detail.Metadata.Label title="Nickname" text={user.public_nick_name} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={user.status || "Unknown"}
              color={user.status ? Color.Green : Color.SecondaryText}
            />
            {user.sub_status && <Detail.Metadata.TagList.Item text={user.sub_status} color={Color.Blue} />}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {user.alias?.map((alias, index) => (
            <Detail.Metadata.Label
              key={index}
              title={alias.type === "EMAIL" ? "Email" : alias.type === "PHONE_NUMBER" ? "Phone" : alias.type}
              text={alias.value}
            />
          ))}
          {treeProgress && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Total Trees Planted"
                text={`${treeProgress.total_trees}`}
                icon={{ source: Icon.Tree, tintColor: Color.Green }}
              />
              <Detail.Metadata.Label
                title="From Card Purchases"
                text={`${treeProgress.card_trees}`}
                icon={{ source: Icon.CreditCard, tintColor: Color.Green }}
              />
              {treeProgress.progress_to_next !== null && (
                <Detail.Metadata.Label
                  title="Progress to Next"
                  text={`${Math.round(treeProgress.progress_to_next * 100)}%`}
                  icon={{ source: Icon.CircleProgress, tintColor: Color.Green }}
                />
              )}
            </>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Open bunq" target="https://bunq.com/app" text="Open in bunq app" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Change Avatar" icon={Icon.Image} url="https://bunq.com/app" />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action
              title="Copy User ID"
              icon={Icon.Clipboard}
              onAction={() => copyToClipboard(user.id?.toString() || "", "user ID")}
            />
            {user.alias?.find((a) => a.type === "EMAIL") && (
              <Action
                title="Copy Email"
                icon={Icon.Clipboard}
                onAction={() => copyToClipboard(user.alias?.find((a) => a.type === "EMAIL")?.value || "", "email")}
              />
            )}
            {user.alias?.find((a) => a.type === "PHONE_NUMBER") && (
              <Action
                title="Copy Phone"
                icon={Icon.Clipboard}
                onAction={() =>
                  copyToClipboard(user.alias?.find((a) => a.type === "PHONE_NUMBER")?.value || "", "phone")
                }
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Reset Connection"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={session.reconnect}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function UserListItem({ user }: { user: BunqUser }) {
  const icon =
    user.type === "UserPerson" ? Icon.Person : user.type === "UserCompany" ? Icon.Building : Icon.PersonCircle;

  return (
    <List.Item
      id={user.id.toString()}
      title={user.displayName}
      subtitle={user.publicNickName ?? ""}
      icon={{ source: icon, tintColor: Color.Blue }}
      accessories={[{ tag: { value: user.type.replace("User", ""), color: Color.SecondaryText } }]}
    />
  );
}

export default function ProfileCommand() {
  const session = useBunqSession();

  const {
    data: users,
    isLoading: usersLoading,
    error: usersError,
    revalidate: revalidateUsers,
  } = usePromise(
    async () => {
      if (!session.sessionToken) return [];
      return getUsers(session.getRequestOptions());
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    revalidate: revalidateProfile,
  } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken) return null;
      const userId = requireUserId(session);
      return withSessionRefresh(session, () => getUserProfile(userId, session.getRequestOptions()));
    },
    [],
    { execute: session.isConfigured && !session.isLoading && !!session.userId },
  );

  const { data: treeProgress, revalidate: revalidateTreeProgress } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken) return null;
      const userId = requireUserId(session);
      return withSessionRefresh(session, () => getTreeProgress(userId, session.getRequestOptions()));
    },
    [],
    { execute: session.isConfigured && !session.isLoading && !!session.userId },
  );

  const revalidate = () => {
    revalidateUsers();
    revalidateProfile();
    revalidateTreeProgress();
  };

  if (session.isLoading || usersLoading || profileLoading) {
    return <Detail isLoading markdown="Loading profile..." />;
  }

  if (session.error || usersError || profileError) {
    return (
      <ErrorView
        title="Error Loading Profile"
        message={getErrorMessage(session.error || usersError || profileError)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  // If we have a profile, show it directly
  if (profile) {
    return <UserProfileDetail user={profile} session={session} treeProgress={treeProgress ?? null} />;
  }

  // Otherwise show user list
  if (users && users.length > 0) {
    return (
      <List>
        <List.Section title="Connected Users">
          {users.map((user) => (
            <UserListItem key={user.id.toString()} user={user} />
          ))}
        </List.Section>
      </List>
    );
  }

  return (
    <Detail
      markdown="# No Profile Found\n\nUnable to load your bunq profile. Please check your API key and try again."
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action
            title="Reset Connection"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={session.reconnect}
          />
        </ActionPanel>
      }
    />
  );
}
