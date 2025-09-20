import { formatUrl, generateRemainderScript } from "../utils";

import { Action, ActionPanel, Color, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { ConclusionView } from "./conslusionView";
import { runAppleScript } from "run-applescript";

const { Metadata } = List.Item.Detail;

export function Video(props: {
  title: string;
  cover: string;
  url: string;
  uploader: Bilibili.Uploader;
  bvid: string;
  cid?: number;
  duration: string;
  pubdate: number;
  stat: {
    highlight?: string;
    view?: string;
    danmaku?: string;
    like?: string;
    coin?: string;
  };
  onOpenCallback?: () => void;
  markAsWatchedCallback?: () => Promise<void>;
}) {
  async function addWatchLaterReminder() {
    try {
      await runAppleScript(generateRemainderScript(props.title, props.uploader.name, props.url));

      await showToast({
        style: Toast.Style.Success,
        title: "Reminder added",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Reminder failed to add",
      });
    }
  }
  return (
    <List.Item
      title={props.title}
      detail={
        <List.Item.Detail
          markdown={`<img src="${formatUrl(props.cover)}" center width="300" />`}
          metadata={
            <Metadata>
              <Metadata.Label title={props.title} />
              <Metadata.Label
                title="Uploader"
                text={props.uploader.name}
                icon={{
                  source: formatUrl(props.uploader.face),
                  mask: Image.Mask.Circle,
                }}
              />
              <Metadata.Label title="Duration" text={String(props.duration)} />
              <Metadata.Label title="Time" text={new Date(props.pubdate * 1000).toLocaleString()} />
              <Metadata.TagList title="Stat">
                {props.stat.highlight && (
                  <Metadata.TagList.Item text={props.stat.highlight} color={"#FB7299"} />
                )}
                {props.stat.view && (
                  <Metadata.TagList.Item text={`Play: ${props.stat.view}`} color={Color.Green} />
                )}
                {props.stat.coin && (
                  <Metadata.TagList.Item text={`Coin: ${props.stat.coin}`} color={Color.Orange} />
                )}
                {props.stat.view && (
                  <Metadata.TagList.Item text={`View: ${props.stat.view}`} color={Color.Purple} />
                )}
                {props.stat.danmaku && (
                  <Metadata.TagList.Item text={`Danmaku: ${props.stat.danmaku}`} color={Color.Blue} />
                )}
              </Metadata.TagList>
            </Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Video" url={formatUrl(props.url)} onOpen={props.onOpenCallback} />
          <Action.Push
            icon={Icon.QuoteBlock}
            title="AI Summary"
            target={<ConclusionView bvid={props.bvid} cid={props.cid || 0} up_mid={props.uploader.mid} />}
          />
          {props.markAsWatchedCallback && (
            <Action.SubmitForm
              title="Mark as Watched"
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              icon={Icon.CircleProgress100}
              onSubmit={async () => {
                props.markAsWatchedCallback && (await props.markAsWatchedCallback());
              }}
            />
          )}
          <Action
            title="Add reminder to watch later"
            onAction={addWatchLaterReminder}
            icon={Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.OpenInBrowser
            title={`Open ${props.uploader.name} Dynamic`}
            url={`https://space.bilibili.com/${props.uploader.mid}/dynamic`}
          />
        </ActionPanel>
      }
    />
  );
}
