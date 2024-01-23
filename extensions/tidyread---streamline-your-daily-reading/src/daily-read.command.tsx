import { useEffect, useState } from "react";
import { Source } from "./types";
import { filterByShownStatus, shell, sleep } from "./utils/util";
import {
  Action,
  Color,
  Detail,
  Icon,
  Keyboard,
  LaunchType,
  List,
  Toast,
  launchCommand,
  showToast,
  useNavigation,
  LaunchProps,
} from "@raycast/api";
import { bizGenDigest, categorizeSources } from "./utils/biz";
import { NO_API_KEY, NO_FEEDS, matchError } from "./utils/error";
import { getSources, getTodaysDigest } from "./store";
import { capitalize } from "lodash";
import { usePromise } from "@raycast/utils";
import DigestListItem from "./components/DigestListItem";
import DigestDetail from "./components/DigestDetail";
import SharableLinkAction from "./components/SharableLinkAction";
import CustomActionPanel from "./components/CustomActionPanel";

export default function DailyReadCommand(props: LaunchProps<{ launchContext: { autoGenDigest: boolean } }>) {
  const autoGenDigest = props?.launchContext?.autoGenDigest ?? false;
  const [todayItems, setTodayItems] = useState<Source[]>();
  const [otherItems, setOtherItems] = useState<Source[]>();
  const itemsLength = (todayItems?.length ?? 0) + (otherItems?.length ?? 0);
  const { data: todaysDigest, revalidate } = usePromise(getTodaysDigest);

  const { push } = useNavigation();

  useEffect(() => {
    loadSources();
  }, []);

  const handleGenDigest = async (type: "manual" | "auto" = "manual") => {
    try {
      showToast(Toast.Style.Animated, "Generating Digest");
      await bizGenDigest(type);
      showToast(Toast.Style.Success, "Generating Success");
      await revalidate();
    } catch (err: any) {
      if (matchError(err, NO_API_KEY)) {
        showToast(Toast.Style.Failure, "Generating Failed");
        const markdown = "API key not found. Press Enter to update it in command preferences and try again.";

        push(<Detail markdown={markdown} actions={<CustomActionPanel />} />);
        return;
      }

      if (matchError(err, NO_FEEDS)) {
        showToast(Toast.Style.Failure, "Generating Failed");
        const markdown =
          "No RSS link found in today's sources, please add some and try again. Press Enter to manage your sources.";

        push(
          <Detail markdown={markdown} actions={<CustomActionPanel>{manageSourceListActionNode}</CustomActionPanel>} />,
        );
        return;
      }

      if (matchError(err, "ECONNRESET")) {
        showToast(Toast.Style.Failure, "Network Error", "Check your network and try again.");
        return;
      }

      if (matchError(err, "timed out")) {
        showToast(Toast.Style.Failure, "Request Timeout", "Check your network, or add http proxy and try again.");
        return;
      }

      showToast(Toast.Style.Failure, "Error", err.message);
    }
  };

  useEffect(() => {
    async function fn() {
      if (autoGenDigest) {
        await sleep(500);
        await handleGenDigest("auto");
      }
    }

    fn();
  }, [autoGenDigest]);

  const loadSources = async () => {
    const items = await getSources();
    const { todayItems, otherItems } = categorizeSources(items);
    setTodayItems(todayItems);
    setOtherItems(otherItems);
  };

  const openMultipleUrls = async (items: Source[]) => {
    const urls = items.map((item) => item.url);
    await shell(`open ${urls.join(" ")}`);
  };

  const generateDigestActionNode = (
    <Action
      title={todaysDigest ? "Regenerate Today's Digest" : "Generate Today's Digest"}
      icon={Icon.Stars}
      onAction={handleGenDigest}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
    />
  );

  const manageSourceListActionNode = (
    <Action
      title="Manage Source List"
      shortcut={Keyboard.Shortcut.Common.Edit}
      icon={Icon.Pencil}
      onAction={() => {
        launchCommand({ name: "manage-source-list.command", type: LaunchType.UserInitiated });
      }}
    />
  );

  return (
    <List isLoading={!todayItems && !otherItems}>
      {itemsLength === 0 ? (
        <List.EmptyView
          actions={
            <CustomActionPanel>
              {manageSourceListActionNode}
              {generateDigestActionNode}
            </CustomActionPanel>
          }
          title="No Sources Found"
          description="Go to manage your sources"
        />
      ) : (
        <>
          <List.Section title="Daily Digest">
            {todaysDigest ? (
              <DigestListItem
                digest={todaysDigest}
                itemProps={{
                  actions: (
                    <CustomActionPanel>
                      <Action.Push
                        icon={Icon.Eye}
                        title="View Detail"
                        target={<DigestDetail digest={todaysDigest} />}
                      />
                      {generateDigestActionNode}
                      <SharableLinkAction
                        actionTitle="Share This Digest"
                        articleTitle={todaysDigest.title}
                        articleContent={todaysDigest.content}
                      />
                    </CustomActionPanel>
                  ),
                }}
              />
            ) : (
              <List.Item
                title={"Your digest for today has not been generated yet"}
                subtitle="press Enter to generate"
                actions={<CustomActionPanel>{generateDigestActionNode}</CustomActionPanel>}
              />
            )}
          </List.Section>
          <List.Section title="Today">
            {(todayItems || []).map((item, index) => (
              <List.Item
                key={index}
                title={item.title}
                // subtitle={item.url}
                icon={item.favicon || Icon.Book}
                accessories={filterByShownStatus([
                  {
                    icon: "./rssicon.svg",
                    tooltip: "This source has a rss link which can be used for daily digest.",
                    show: !!item.rssLink,
                  },
                  {
                    tag: {
                      value: `${(item.tags || [])?.join?.(", ")}`,
                      color: Color.Blue,
                    },
                    show: item.tags?.length > 0,
                  },
                  {
                    tag: {
                      value: item.schedule === "custom" ? item.customDays?.join?.(", ") : capitalize(item.schedule),
                      color: Color.SecondaryText,
                    },
                    show: true,
                  },
                ])}
                actions={
                  <CustomActionPanel>
                    <Action.OpenInBrowser url={item.url} title="Open URL" />
                    <Action
                      icon={Icon.ArrowNe}
                      title="Open All Today's Sources"
                      onAction={() => openMultipleUrls(todayItems!)}
                    />
                    {manageSourceListActionNode}
                    {generateDigestActionNode}
                    {item.rssLink && (
                      <Action.OpenInBrowser
                        shortcut={{ modifiers: ["cmd"], key: "l" }}
                        url={item.rssLink}
                        title="Open RSS Link"
                      />
                    )}
                  </CustomActionPanel>
                }
              />
            ))}
          </List.Section>
          <List.Section title="Others">
            {(otherItems || []).map((item, index) => (
              <List.Item
                key={index}
                title={item.title}
                // subtitle={item.url}
                icon={item.favicon || Icon.Book}
                accessories={filterByShownStatus([
                  {
                    icon: "./rssicon.svg",
                    tooltip: "This source has a rss link which can be used for daily digest.",
                    show: !!item.rssLink,
                  },
                  {
                    tag: {
                      value: `${(item.tags || [])?.join?.(", ")}`,
                      color: Color.Blue,
                    },
                    show: item.tags?.length > 0,
                  },
                  {
                    tag: {
                      value: item.schedule === "custom" ? item.customDays?.join?.(", ") : capitalize(item.schedule),
                      color: Color.SecondaryText,
                    },
                    show: true,
                  },
                ])}
                actions={
                  <CustomActionPanel>
                    <Action.OpenInBrowser url={item.url} title="Open URL" />
                    <Action
                      icon={Icon.ArrowNe}
                      title="Open All Other's Sources"
                      onAction={() => openMultipleUrls(otherItems!)}
                    />
                    {manageSourceListActionNode}
                    {item.rssLink && (
                      <Action.OpenInBrowser
                        shortcut={{ modifiers: ["cmd"], key: "l" }}
                        url={item.rssLink}
                        title="Open RSS Link"
                      />
                    )}
                  </CustomActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
