import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useMailerSendPaginated } from "./mailersend";
import { Activity, ActivityEventType, Domain } from "./interfaces";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import DNSRecords from "./domain/dns-records";
import Webhooks from "./webhooks";
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
              <Action.Push icon={Icon.Plug} title="Webhooks" target={<Webhooks domain={domain} />} />
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action.Push icon={Icon.Text} title="DNS Records" target={<DNSRecords domain={domain} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Activities({ domain }: { domain: Domain }) {
  const [filter, setFilter] = useState("");
  const from = useMemo(() => dayjs().subtract(1, "day").unix(), []);
  const to = useMemo(() => dayjs().unix(), []);

  const TYPE_TO_COLOR: Record<ActivityEventType, Color | undefined> = {
    [ActivityEventType.OPENED]: Color.Green,
    [ActivityEventType.DELIVERED]: Color.Blue,
    [ActivityEventType.QUEUED]: undefined,
    [ActivityEventType.SENT]: undefined,
    [ActivityEventType.SOFT_BOUNCED]: Color.Orange,
    [ActivityEventType.HARD_BOUNCED]: Color.Red,
    [ActivityEventType.CLICKED]: Color.Purple,
    [ActivityEventType.UNSUBSCRIBED]: undefined,
    [ActivityEventType.SPAM_COMPLAINTS]: undefined,
  };

  const {
    isLoading,
    data: activities,
    pagination,
  } = useMailerSendPaginated<Activity>(`activity/${domain.id}?date_from=${from}&date_to=${to}&event=${filter}`);

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Event status" onChange={setFilter}>
          <List.Dropdown.Item icon={Icon.Dot} title="All" value="" />
          <List.Dropdown.Section>
            {Object.entries(ActivityEventType).map(([key, val]) => (
              <List.Dropdown.Item
                key={key}
                icon={{ source: Icon.Dot, tintColor: TYPE_TO_COLOR[val] }}
                title={key}
                value={val}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && !activities.length && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No activity found"
          description="Please try again with other keywords, filters or set a different period."
        />
      )}
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
