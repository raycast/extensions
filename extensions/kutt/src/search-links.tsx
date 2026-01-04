import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  openExtensionPreferences,
  List,
  confirmAlert,
  Color,
  Alert,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise, getFavicon, useFetch } from "@raycast/utils";
import { useState } from "react";
import { buildApiUrl, LIMIT, API_HEADERS, parseApiResponse } from "./kutt";
import { PaginatedResult, Link, Item, StatsItem, type LinkStats } from "./types";
import CreateLink from "./create-link";

export default function Command() {
  try {
    buildApiUrl();
    return <SearchLinks />;
  } catch {
    return (
      <Detail
        markdown={"# ERROR \n\n Invalid URL in `Preferences`"}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }
}

function SearchLinks() {
  const {
    isLoading,
    data: links,
    pagination,
    mutate,
  } = useCachedPromise(
    () => async (options) => {
      const response = await fetch(buildApiUrl(`links?limit=${LIMIT}&skip=${options.page * LIMIT}`), {
        headers: API_HEADERS,
      });
      const result = (await parseApiResponse(response)) as PaginatedResult<Link>;
      return {
        data: result.data,
        hasMore: result.total > result.skip + result.limit,
      };
    },
    [],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {!isLoading && !links.length ? (
        <List.EmptyView
          title="No links."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Link" target={<CreateLink />} onPop={mutate} />
            </ActionPanel>
          }
        />
      ) : (
        links.map((link) => (
          <List.Item
            key={link.id}
            icon={getFavicon(link.target, { fallback: Icon.Link })}
            title={link.target}
            subtitle={link.link}
            accessories={[{ icon: Icon.Eye, text: link.visit_count.toString() }, { date: new Date(link.created_at) }]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.PieChart} title="View Link Stats" target={<LinkStats link={link} />} />
                <Action.CopyToClipboard title="Copy Short Link" content={link.link} />
                <Action
                  icon={Icon.Trash}
                  title="Delete Link"
                  onAction={() =>
                    confirmAlert({
                      icon: { source: Icon.Trash, tintColor: Color.Red },
                      title: "Delete Link",
                      message: `Are you sure do you want to delete the link "${link.link.replace("https://", "")}"?`,
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "Delete",
                        async onAction() {
                          const toast = await showToast(Toast.Style.Animated, "Deleting link", link.link);
                          try {
                            await mutate(
                              fetch(buildApiUrl(`links/${link.id}`), {
                                method: "DELETE",
                                headers: API_HEADERS,
                              }),
                              {
                                optimisticUpdate(data) {
                                  return data.filter((l) => l.id !== link.id);
                                },
                                shouldRevalidateAfter: false,
                              },
                            );
                            toast.style = Toast.Style.Success;
                            toast.title = "Link deleted";
                            toast.message = link.link;
                          } catch (error) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed to delete link";
                            toast.message = `${error}`;
                          }
                        },
                      },
                    })
                  }
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
                <Action.Push
                  icon={Icon.Plus}
                  title="Create Link"
                  target={<CreateLink />}
                  onPop={mutate}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function MarkdownDetailItem({ items }: { items: Item[] }) {
  return (
    <List.Item.Detail
      markdown={`
| name | value |
|------|-------|
${items.map((item) => `| ${item.name} | ${item.value} |`).join("\n")}`}
    />
  );
}
function StatListItem({ item }: { item: StatsItem }) {
  return (
    <>
      <List.Section title="Stats">
        <List.Item title="Browser" detail={<MarkdownDetailItem items={item.stats.browser} />} />
        <List.Item title="OS" detail={<MarkdownDetailItem items={item.stats.os} />} />
        <List.Item title="Country" detail={<MarkdownDetailItem items={item.stats.country} />} />
        <List.Item title="Referrer" detail={<MarkdownDetailItem items={item.stats.referrer} />} />
      </List.Section>
      <List.Item
        icon={Icon.Eye}
        title="Views"
        detail={
          <List.Item.Detail
            markdown={`
| - |
|---|
${item.views.map((view) => `| ${view} |`).join("\n")}
| ${item.total} |`}
          />
        }
      />
    </>
  );
}
function LinkStats({ link }: { link: Link }) {
  const [filter, setFilter] = useState("lastYear");
  const { isLoading, data } = useFetch(buildApiUrl(`links/${link.id}/stats`), {
    headers: API_HEADERS,
    parseResponse: parseApiResponse,
    mapResult(result) {
      return {
        data: result as LinkStats,
      };
    },
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item icon={Icon.Calendar} title="Last Year" value="lastYear" />
          <List.Dropdown.Item icon={Icon.Calendar} title="Last Month" value="lastMonth" />
          <List.Dropdown.Item icon={Icon.Calendar} title="Last Week" value="lastWeek" />
          <List.Dropdown.Item icon={Icon.Calendar} title="Last Day" value="lastDay" />
        </List.Dropdown>
      }
    >
      {data && <StatListItem item={data[filter as keyof typeof data]} />}
    </List>
  );
}
