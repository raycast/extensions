import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getFrontmostApplication,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { generateTimestamp, prettyPreview, TimestampType, validateSnowflake } from "./timestamps";
import Style = Toast.Style;

interface frontmostApp {
  path: string;
  name: string;
}

export default function Command() {
  const { defaultAction } = getPreferenceValues();
  const { data }: { data?: frontmostApp } = usePromise(getFrontmostApplication);
  const [date, setDate] = useState<Date>(new Date());
  const isCurrentRef = useRef<boolean>(true);

  useEffect(() => {
    const timeToNextSecond = 1000 - date.getMilliseconds();
    setTimeout(() => {
      if (isCurrentRef.current) {
        setDate(new Date());
      }
      setInterval(() => {
        if (isCurrentRef.current) {
          setDate(new Date());
        }
      }, 1000);
    }, timeToNextSecond);
  }, []);

  function Actions(props: { type: TimestampType }) {
    const { type } = props;

    return (
      <ActionPanel>
        {defaultAction === "paste" ? (
          <>
            <Action.Paste
              content={`${generateTimestamp(date, type)}`}
              title={"Paste to " + data?.path.split("/").pop()?.split(".").shift() || data?.name || "Active App"}
              icon={{ fileIcon: data?.path || "" }}
            />
            <Action.CopyToClipboard content={`${generateTimestamp(date, type)}`} />
          </>
        ) : (
          <>
            <Action.CopyToClipboard content={`${generateTimestamp(date, type)}`} />
            <Action.Paste content={`${generateTimestamp(date, type)}`} />
          </>
        )}
      </ActionPanel>
    );
  }

  return (
    <List navigationTitle="Generate Discord Timestamp">
      <List.Section title="Input Date">
        <List.Item
          title={"Set Date From Input"}
          actions={
            <ActionPanel>
              <Action.PickDate
                title="Set Date"
                onChange={async (date) => {
                  if (date) {
                    isCurrentRef.current = false;
                    setDate(date);
                    await showToast({
                      style: Style.Success,
                      title: "Success",
                      message: `Date Set To ` + date.toLocaleString(),
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title={"Set Date From Snowflake In Clipboard"}
          actions={
            <ActionPanel>
              <Action
                title="Retrieve From Clipboard"
                icon={{ source: Icon.Clipboard }}
                onAction={() => {
                  Clipboard.readText().then(async (text) => {
                    if (text) {
                      try {
                        isCurrentRef.current = false;
                        const snowflakeDate = validateSnowflake(text);
                        setDate(snowflakeDate);
                        await showToast({
                          style: Style.Success,
                          title: "Success",
                          message: `Date Set To ${snowflakeDate.toLocaleString()}`,
                        });
                      } catch (e: unknown) {
                        await showToast({
                          style: Style.Failure,
                          title: "Invalid Snowflake",
                          message: e instanceof Error ? e.message : String(e),
                        });
                      }
                    } else {
                      await showToast({
                        style: Style.Failure,
                        title: "Invalid Snowflake",
                        message: "The clipboard is empty",
                      });
                    }
                  });
                }}
              />
              <Action.Push title={"What Is A Snowflake"} icon={{ source: Icon.Info }} target={<SnowflakeGuide />} />
            </ActionPanel>
          }
        />
        <List.Item
          title={"Set Date From Current Time"}
          actions={
            <ActionPanel>
              <Action
                title="Set Date To Current Time"
                icon={{ source: Icon.Clock }}
                onAction={async () => {
                  setDate(new Date());
                  isCurrentRef.current = true;
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Timestamps (shown in your local timezone)">
        <List.Item title={"Short Time"} subtitle={`${prettyPreview(date, "t")}`} actions={<Actions type={"t"} />} />
        <List.Item title={"Long Time"} subtitle={`${prettyPreview(date, "T")}`} actions={<Actions type={"T"} />} />
        <List.Item title={"Short Date"} subtitle={`${prettyPreview(date, "d")}`} actions={<Actions type={"d"} />} />
        <List.Item title={"Long Date"} subtitle={`${prettyPreview(date, "D")}`} actions={<Actions type={"D"} />} />
        <List.Item
          title={"Short Date/Time"}
          subtitle={`${prettyPreview(date, "f")}`}
          actions={<Actions type={"f"} />}
        />
        <List.Item title={"Long Date/Time"} subtitle={`${prettyPreview(date, "F")}`} actions={<Actions type={"F"} />} />
        <List.Item title={"Relative Time"} subtitle={`${prettyPreview(date, "R")}`} actions={<Actions type={"R"} />} />
        <List.Item title={"Epoch Time"} subtitle={`${prettyPreview(date, "E")}`} actions={<Actions type={"E"} />} />
        <List.Item title={"ISO Date/Time"} subtitle={`${prettyPreview(date, "I")}`} actions={<Actions type={"I"} />} />
      </List.Section>
    </List>
  );
}

function SnowflakeGuide() {
  return (
    <Detail
      markdown={
        "# ❄️ What is a snowflake?\n" +
        "A snowflake is a unique ID that Discord uses to identify messages, users, and other objects. Every snowflake includes the exact creation date and time of the object it's linked to.\n" +
        "## How do I get a snowflake?\n" +
        "1. Enable developer mode in Discord.\n" +
        "2. Right click on a message, user, or other object.\n" +
        '3. Click "Copy ID".\n' +
        "## How do I enable developer mode?\n" +
        "1. Go to your Discord settings.\n" +
        '2. Scroll down to the "Advanced" section.\n' +
        '3. Enable "Developer Mode".\n'
      }
    />
  );
}
