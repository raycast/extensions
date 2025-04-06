import { Action, ActionPanel, Detail, Icon, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { API_BASE_URL, API_KEY } from "./utils/constants";

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchMembers }>) {
  try {
    const { method, search } = props.arguments;
    let baseUrl = "";

    switch (method) {
      case "username":
        baseUrl = `${API_BASE_URL}/members/usernames/${search}`;
        break;
      case "userID":
        baseUrl = `${API_BASE_URL}/members/${search}`;
        break;
      case "discordID":
        baseUrl = `${API_BASE_URL}/members/discords/${search}`;
        break;
      default:
        throw new Error("Invalid search method");
    }

    const { data, isLoading, error } = useFetch<MemberSearchResult[]>(baseUrl, {
      headers: { Authorization: `Private ${API_KEY}`, "Content-Type": "application/json" },
      parseResponse: parseFetchResponse,
    });

    if (isLoading) {
      return <Detail isLoading={true} markdown="Loading..." />;
    }

    if (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return <Detail markdown={`# Error\n${errorMessage}`} />;
    }

    if (!data || data.length === 0) {
      return <Detail markdown="# No user found" />;
    }

    // Assuming we want the first result if multiple are returned
    const member = data[0];
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    };

    return (
      <Detail
        navigationTitle={`${member.username}`}
        markdown={handleAvatar(member)}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Username" text={member.username} />
            <Detail.Metadata.Label title="Member ID" text={member.member_id.toString()} />
            <Detail.Metadata.Label
              title="Join Date"
              text={
                member.join_date ? new Date(member.join_date * 1000).toLocaleDateString(undefined, dateOptions) : "N/A"
              }
            />
            <Detail.Metadata.Label
              title="Last Activity Date"
              text={
                member.last_activity_date
                  ? new Date(member.last_activity_date * 1000).toLocaleDateString(undefined, dateOptions)
                  : "N/A"
              }
            />
            {handleRoles(member)}
            {handleStats(member)}
            {handleFeedback(member)}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel title="BuiltByBit">
            <Action.OpenInBrowser url={`https://www.builtbybit.com/members/${member.member_id}`} />
            <Action.CopyToClipboard
              title="Copy Profile Link"
              content={`https://www.builtbybit.com/members/${member.username}.${member.member_id}`}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            {member.discord_id ? (
              <Action.CopyToClipboard
                title="Copy Discord ID"
                icon={Icon.Hashtag}
                content={member.discord_id}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            ) : null}
            <ActionPanel.Section title="Staff Actions">
              <Action.OpenInBrowser
                icon={Icon.Pencil}
                url={`https://www.builtbybit.com/members/${member.member_id}/edit`}
                title="Open in Admin Control Panel"
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
              <Action.OpenInBrowser
                icon={Icon.Ticket}
                url={`https://www.builtbybit.com/tickets/queue?creator_id=${member.member_id}`}
                title="View Tickets"
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return <Detail markdown={`# Error\n${errorMessage}`} />;
  }
}

function handleAvatar(member: MemberSearchResult) {
  if (member.avatar_url.endsWith("?0")) {
    return `![${member.username}](../assets/bbb-icon.png?raycast-width=196&raycast-height=196) \n### Default Avatar`;
  } else {
    return `![${member.username}](${member.avatar_url})`;
  }
}

function handleStats(member: MemberSearchResult) {
  const counts = [];
  if (member.post_count > 0) {
    counts.push(<Detail.Metadata.Label key="posts" title="Posts" text={member.post_count.toString()} />);
  }
  if (member.resource_count > 0) {
    counts.push(<Detail.Metadata.Label key="resources" title="Resources" text={member.resource_count.toString()} />);
  }
  if (member.purchase_count > 0) {
    counts.push(<Detail.Metadata.Label key="purchases" title="Purchases" text={member.purchase_count.toString()} />);
  }
  if (counts.length !== 0) {
    return (
      <>
        <Detail.Metadata.Separator />
        {counts}
      </>
    );
  }
}

function handleFeedback(member: MemberSearchResult) {
  const feedback = [];

  if (member.feedback_positive > 0) {
    feedback.push(
      <Detail.Metadata.TagList.Item key="positive" text={`Positive: ${member.feedback_positive}`} color="green" />,
    );
  }
  if (member.feedback_neutral > 0) {
    feedback.push(
      <Detail.Metadata.TagList.Item key="neutral" text={`Neutral: ${member.feedback_neutral}`} color="white" />,
    );
  }
  if (member.feedback_negative > 0) {
    feedback.push(
      <Detail.Metadata.TagList.Item key="negative" text={`Negative: ${member.feedback_negative}`} color="red" />,
    );
  }

  if (feedback.length !== 0) {
    return (
      <>
        <Detail.Metadata.Separator />
        <Detail.Metadata.TagList title="Feedback">{feedback}</Detail.Metadata.TagList>
      </>
    );
  }
}

function handleRoles(member: MemberSearchResult) {
  const roles = [];
  if (member.banned) {
    roles.push(<Detail.Metadata.TagList.Item text="Banned" key="banned" color="#969696" />);
  }
  if (member.suspended) {
    roles.push(<Detail.Metadata.TagList.Item text="Suspended" key="suspended" color="#969696" />);
  }
  if (member.restricted) {
    roles.push(<Detail.Metadata.TagList.Item text="Restricted" key="restricted" color="#969696" />);
  }
  if (member.premium) {
    roles.push(<Detail.Metadata.TagList.Item text="Premium" key="premium" color="#01A0D4" />);
  }
  if (member.supreme) {
    roles.push(<Detail.Metadata.TagList.Item text="Supreme" key="supreme" color="#DE9C33" />);
  }
  if (member.ultimate) {
    roles.push(<Detail.Metadata.TagList.Item text="Ultimate" key="ultimate" color="#01A9A1" />);
  }
  if (roles.length !== 0) {
    return (
      <>
        <Detail.Metadata.Separator />
        <Detail.Metadata.TagList title="Roles">{roles}</Detail.Metadata.TagList>
      </>
    );
  }
  return null;
}

async function parseFetchResponse(response: Response) {
  try {
    const json = await response.json();

    if (!response.ok || "error" in json) {
      throw new Error("error" in json ? json.error.message : response.statusText);
    }

    return [
      {
        member_id: json.data.member_id,
        username: json.data.username,
        join_date: json.data.join_date,
        last_activity_date: json.data.last_activity_date,
        banned: json.data.banned,
        suspended: json.data.suspended,
        restricted: json.data.restricted,
        premium: json.data.premium,
        supreme: json.data.supreme,
        ultimate: json.data.ultimate,
        discord_id: json.data.discord_id,
        avatar_url: json.data.avatar_url,
        post_count: json.data.post_count,
        resource_count: json.data.resource_count,
        purchase_count: json.data.purchase_count,
        feedback_positive: json.data.feedback_positive,
        feedback_neutral: json.data.feedback_neutral,
        feedback_negative: json.data.feedback_negative,
      },
    ] as MemberSearchResult[];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unknown error occurred");
  }
}

interface MemberSearchResult {
  member_id: number;
  username: string;
  join_date: number;
  last_activity_date?: number;
  banned: boolean;
  suspended: boolean;
  restricted: boolean;
  premium: boolean;
  supreme: boolean;
  ultimate: boolean;
  discord_id?: number;
  avatar_url: string;
  post_count: number;
  resource_count: number;
  purchase_count: number;
  feedback_positive: number;
  feedback_neutral: number;
  feedback_negative: number;
}
