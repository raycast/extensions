import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";
import { PostList } from "./components/PostList";
import DirectMessages from "./direct-messages";
import RecentComments from "./recent-comments";
import { formatDate, formatNumber, humanizeKey } from "./lib/format";
import { api, APP_URL, authHeaders } from "./lib/postproxy";
import type { SummaryResponse } from "./lib/types";

const WINDOWS = [
  { value: "24h", title: "Last 24 Hours" },
  { value: "7d", title: "Last 7 Days" },
  { value: "30d", title: "Last 30 Days" },
];

/** A colored ▲/▼ delta tag vs the previous window, or null when there's no comparison. */
function deltaAccessory(
  current: number,
  previous: number | null | undefined,
  neutral = false,
): List.Item.Accessory | null {
  if (previous == null) return null;
  const delta = current - previous;
  const tooltip = `Previous: ${formatNumber(previous)}`;
  if (delta === 0) return { tag: { value: "±0", color: Color.SecondaryText }, tooltip };
  const up = delta > 0;
  const color = neutral ? Color.SecondaryText : up ? Color.Green : Color.Red;
  return { tag: { value: up ? `▲ +${delta}` : `▼ ${delta}`, color }, tooltip };
}

function countTag(n: number): List.Item.Accessory {
  return { tag: { value: formatNumber(n), color: n > 0 ? Color.Orange : Color.SecondaryText } };
}

export default function Status() {
  const [win, setWin] = useState("24h");
  const { data, isLoading, revalidate } = useFetch<SummaryResponse>(api(`/summary?window=${win}`), {
    headers: authHeaders(),
    keepPreviousData: true,
  });

  const windowLabel = WINDOWS.find((w) => w.value === win)?.title ?? win;

  const common = () => (
    <ActionPanel.Section>
      <Action.OpenInBrowser title="Open Dashboard on Postproxy" icon={Icon.Globe} url={APP_URL} />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={() => revalidate()}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel.Section>
  );

  const openComments = <Action.Push title="Open Recent Comments" icon={Icon.Bubble} target={<RecentComments />} />;
  const openDMs = <Action.Push title="Open Direct Messages" icon={Icon.Message} target={<DirectMessages />} />;
  const openPosts = (initialStatus: string, title: string) => (
    <Action.Push title={title} icon={Icon.Document} target={<PostList initialStatus={initialStatus} />} />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Status · ${windowLabel}`}
      searchBarPlaceholder="Search status…"
      searchBarAccessory={
        <List.Dropdown tooltip="Time window" value={win} onChange={setWin}>
          {WINDOWS.map((w) => (
            <List.Dropdown.Item key={w.value} icon={Icon.Calendar} title={w.title} value={w.value} />
          ))}
        </List.Dropdown>
      }
    >
      {data ? (
        <>
          <List.Section title="Needs Reply" subtitle="current backlog">
            <List.Item
              icon={{
                source: Icon.Bubble,
                tintColor: data.comments.awaiting_reply > 0 ? Color.Orange : Color.SecondaryText,
              }}
              title="Comments awaiting reply"
              accessories={[countTag(data.comments.awaiting_reply)]}
              actions={
                <ActionPanel>
                  {openComments}
                  {common()}
                </ActionPanel>
              }
            />
            {data.dms ? (
              <List.Item
                icon={{
                  source: Icon.Message,
                  tintColor: data.dms.chats_awaiting_reply > 0 ? Color.Orange : Color.SecondaryText,
                }}
                title="Chats awaiting reply"
                accessories={[
                  ...(data.dms.reply_window_closing > 0
                    ? [
                        {
                          tag: { value: `${data.dms.reply_window_closing} closing`, color: Color.Red },
                          tooltip: "Reply window closing (< 6h)",
                        } as List.Item.Accessory,
                      ]
                    : []),
                  countTag(data.dms.chats_awaiting_reply),
                ]}
                actions={
                  <ActionPanel>
                    {openDMs}
                    {common()}
                  </ActionPanel>
                }
              />
            ) : null}
            <List.Item
              icon={{
                source: Icon.Star,
                tintColor: data.reviews.awaiting_reply > 0 ? Color.Orange : Color.SecondaryText,
              }}
              title="Reviews awaiting reply"
              accessories={[countTag(data.reviews.awaiting_reply)]}
              actions={<ActionPanel>{common()}</ActionPanel>}
            />
          </List.Section>

          <List.Section title={`Posts · ${windowLabel}`}>
            <List.Item
              icon={Icon.Upload}
              title="Published"
              accessories={
                [
                  deltaAccessory(data.posts.published, data.posts.published_previous),
                  { text: formatNumber(data.posts.published) },
                ].filter(Boolean) as List.Item.Accessory[]
              }
              actions={
                <ActionPanel>
                  {openPosts("published", "View Published Posts")}
                  {common()}
                </ActionPanel>
              }
            />
            <List.Item
              icon={{ source: Icon.XMarkCircle, tintColor: data.posts.failed > 0 ? Color.Red : Color.SecondaryText }}
              title="Failed"
              accessories={[{ text: formatNumber(data.posts.failed) }]}
              actions={
                <ActionPanel>
                  {openPosts("failed", "View Failed Posts")}
                  {common()}
                </ActionPanel>
              }
            />
            <List.Item
              icon={Icon.Clock}
              title="Scheduled ahead"
              subtitle={data.posts.next_scheduled_at ? `Next: ${formatDate(data.posts.next_scheduled_at)}` : undefined}
              accessories={[{ text: formatNumber(data.posts.scheduled_ahead) }]}
              actions={
                <ActionPanel>
                  {openPosts("scheduled", "View Scheduled Posts")}
                  {common()}
                </ActionPanel>
              }
            />
          </List.Section>

          {data.engagement ? (
            <List.Section
              title="Engagement"
              subtitle={`${formatNumber(data.engagement.posts_with_insights)} posts with insights`}
            >
              {Object.entries(data.engagement.total).map(([key, value]) => (
                <List.Item
                  key={key}
                  icon={Icon.LineChart}
                  title={humanizeKey(key)}
                  accessories={[{ text: formatNumber(value) }]}
                  actions={<ActionPanel>{common()}</ActionPanel>}
                />
              ))}
            </List.Section>
          ) : null}

          <List.Section title={`Comments · ${windowLabel}`}>
            <List.Item
              icon={Icon.Bubble}
              title="Received"
              accessories={
                [
                  deltaAccessory(data.comments.received, data.comments.received_previous),
                  { text: formatNumber(data.comments.received) },
                ].filter(Boolean) as List.Item.Accessory[]
              }
              actions={
                <ActionPanel>
                  {openComments}
                  {common()}
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title={`Reviews · ${windowLabel}`}>
            <List.Item
              icon={Icon.Star}
              title="Received"
              accessories={
                [
                  deltaAccessory(data.reviews.received, data.reviews.received_previous),
                  { text: formatNumber(data.reviews.received) },
                ].filter(Boolean) as List.Item.Accessory[]
              }
              actions={<ActionPanel>{common()}</ActionPanel>}
            />
          </List.Section>

          {data.dms ? (
            <List.Section title={`Direct Messages · ${windowLabel}`}>
              <List.Item
                icon={{ source: Icon.ArrowDownCircle, tintColor: Color.Blue }}
                title="Inbound"
                accessories={[{ text: formatNumber(data.dms.inbound) }]}
                actions={
                  <ActionPanel>
                    {openDMs}
                    {common()}
                  </ActionPanel>
                }
              />
              <List.Item
                icon={{ source: Icon.ArrowUpCircle, tintColor: Color.Green }}
                title="Outbound"
                accessories={[{ text: formatNumber(data.dms.outbound) }]}
                actions={
                  <ActionPanel>
                    {openDMs}
                    {common()}
                  </ActionPanel>
                }
              />
            </List.Section>
          ) : null}

          <List.Section title={`API · ${windowLabel}`}>
            <List.Item
              icon={Icon.Globe}
              title="Calls"
              accessories={
                [
                  deltaAccessory(data.api.calls, data.api.calls_previous, true),
                  { text: formatNumber(data.api.calls) },
                ].filter(Boolean) as List.Item.Accessory[]
              }
              actions={<ActionPanel>{common()}</ActionPanel>}
            />
          </List.Section>
        </>
      ) : null}
    </List>
  );
}
