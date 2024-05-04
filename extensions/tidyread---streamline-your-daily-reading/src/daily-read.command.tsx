import { useEffect, useState } from "react";
import { Source } from "./types";
import { filterByShownStatus, shell, sleep } from "./utils/util";
import {
  Action,
  Color,
  Icon,
  Keyboard,
  LaunchType,
  List,
  launchCommand,
  useNavigation,
  LaunchProps,
} from "@raycast/api";
import { addUtmSourceToUrl, categorizeSources } from "./utils/biz";
import { getSources, getTodaysDigest } from "./store";
import { capitalize } from "lodash";
import { usePromise } from "@raycast/utils";
import DigestListItem from "./components/DigestListItem";
import DigestDetail from "./components/DigestDetail";
import SharableLinkAction from "./components/SharableLinkAction";
import CustomActionPanel from "./components/CustomActionPanel";
import GenTodaysDigestPanel from "./components/GenTodaysDigestPanel";
import RedirectRoute from "./components/RedirectRoute";
import GenDigestInBGAction from "./components/GenDigestInBGAction";
import ShowRSSDetailAction from "./components/ShowRSSDetailAction";

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

  useEffect(() => {
    async function fn() {
      if (autoGenDigest) {
        await sleep(500);
        push(<GenTodaysDigestPanel onSuccess={revalidate} />);
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
    const urls = items.map((item) => addUtmSourceToUrl(item.url));
    await shell(`open ${urls.join(" ")}`);
  };

  const generateDigestActionNode = (
    <Action
      title={todaysDigest ? "Regenerate Today's Digest" : "Generate Today's Digest"}
      icon={Icon.Stars}
      onAction={() => {
        push(<GenTodaysDigestPanel onSuccess={revalidate} />);
      }}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
    />
  );

  const manageSourceListActionNode = (
    <Action
      title="Manage Sources"
      shortcut={Keyboard.Shortcut.Common.Edit}
      icon={Icon.Pencil}
      onAction={() => {
        launchCommand({ name: "manage-source-list.command", type: LaunchType.UserInitiated });
      }}
    />
  );

  return (
    <RedirectRoute>
      <List isLoading={!todayItems && !otherItems}>
        {itemsLength === 0 ? (
          <List.EmptyView
            actions={<CustomActionPanel>{manageSourceListActionNode}</CustomActionPanel>}
            title="No Source Found"
            description="Press `Enter` to manage your sources"
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
                        <GenDigestInBGAction onSuccess={revalidate} autoFocus />
                        <SharableLinkAction
                          actionTitle="Share This Digest"
                          articleTitle={todaysDigest.title}
                          articleContent={todaysDigest.content}
                        />
                        {manageSourceListActionNode}
                      </CustomActionPanel>
                    ),
                  }}
                />
              ) : (
                <List.Item
                  title={"Your digest for today has not been generated yet"}
                  subtitle="press Enter to generate"
                  actions={
                    <CustomActionPanel>
                      {generateDigestActionNode}
                      <GenDigestInBGAction autoFocus onSuccess={revalidate} />
                    </CustomActionPanel>
                  }
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
                      show: (item.tags || [])?.length > 0,
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
                      <Action.OpenInBrowser url={addUtmSourceToUrl(item.url)} title="Open URL" />
                      <Action
                        icon={Icon.ArrowNe}
                        title="Open All Today's Sources"
                        onAction={() => openMultipleUrls(todayItems!)}
                      />
                      {manageSourceListActionNode}
                      {generateDigestActionNode}
                      <GenDigestInBGAction onSuccess={revalidate} />
                      {item.rssLink && <ShowRSSDetailAction rssLink={item.rssLink} url={item.url} />}
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
                      show: (item.tags || [])?.length > 0,
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
                      <Action.OpenInBrowser url={addUtmSourceToUrl(item.url)} title="Open URL" />
                      <Action
                        icon={Icon.ArrowNe}
                        title="Open All Other's Sources"
                        onAction={() => openMultipleUrls(otherItems!)}
                      />
                      {manageSourceListActionNode}
                      {item.rssLink && <ShowRSSDetailAction rssLink={item.rssLink} url={item.url} />}
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
    </RedirectRoute>
  );
}
