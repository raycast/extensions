import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useMailerSendPaginated } from "./mailersend";
import { Activity, ActivityEventType, Domain } from "./interfaces";
import { useMemo } from "react";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
dayjs.extend(localizedFormat);

export default function Domains() {
  const { isLoading, data: domains } = useMailerSendPaginated<Domain>("domains");

  return (
    <List isLoading={isLoading}>
      {domains.map((domain) => (
        <List.Item
          key={domain.id}
          icon={getFavicon(`https://${domain.name}`, { fallback: Icon.Globe })}
          title={domain.name}
          accessories={[
            { tag: { value: "Verified", color: domain.is_verified ? Color.Green : Color.Red } },
            { text: `${domain.domain_stats.sent} Sent` },
            { text: `${domain.domain_stats.delivered} delivered` },
            { text: `${domain.domain_stats.rejected} rejected` },
          ]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Envelope} title="Activities" target={<Activities domain={domain} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Activities({ domain }: { domain: Domain }) {
  const from = useMemo(() => dayjs().subtract(1, "day").unix(), []);
  const to = useMemo(() => dayjs().unix(), []);

  const TYPE_TO_COLOR: Record<ActivityEventType, Color | undefined> = {
    [ActivityEventType.OPENED]: Color.Green,
    [ActivityEventType.DELIVERED]: Color.Blue,
    [ActivityEventType.QUEUED]: undefined,
    [ActivityEventType.SENT]: undefined,
    [ActivityEventType.SOFT_BOUNCED]: undefined,
    [ActivityEventType.HARD_BOUNCED]: undefined,
    [ActivityEventType.CLICKED]: undefined,
    [ActivityEventType.UNSUBSCRIBED]: undefined,
    [ActivityEventType.SPAM_COMPLAINTS]: undefined,
  };

  const {
    isLoading,
    data: activities,
    pagination,
  } = useMailerSendPaginated<Activity>(`activity/${domain.id}?date_from=${from}&date_to=${to}`);
  return (
    <List isLoading={isLoading} pagination={pagination}>
      <List.Section
        title={domain.name}
        subtitle={`${dayjs.unix(from).format("lll")} - ${dayjs.unix(to).format("lll")}`}
      >
        {activities.map((activity) => (
          <List.Item
            key={activity.id}
            icon={{ value: { source: Icon.Dot, tintColor: TYPE_TO_COLOR[activity.type] }, tooltip: activity.type }}
            title={activity.email.recipient.email}
            subtitle={activity.email.subject}
            accessories={[{ date: new Date(activity.created_at) }]}
          />
        ))}
      </List.Section>
    </List>
  );
}
