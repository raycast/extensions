import { ActionPanel, Action, Icon, List, Detail, closeMainWindow } from "@raycast/api";
import { runAppleScriptSilently } from "./utils";
import { useState } from "react";

const SESSIONS = [
  {
    id: 0,
    title: "Session 30 min of deep work mode and 5 min of break mode",
    subtitle: "",
    time: 30,
    break_time: 5,
    accessory: "Start",
  },
  {
    id: 1,
    title: "Session 1h of deep work and 10 min of break mode",
    subtitle: "",
    time: 60,
    break_time: 10,
    accessory: "Start",
  },

  {
    id: 2,
    title: "Session 1h30 of deep work and 15 min of break mode",
    subtitle: "",
    time: 90,
    break_time: 15,
    accessory: "Start",
  },
];

const markdown = `
# Music Timer
<img src="../assets/music_timer_icon.png" width="200" height="200"/>
Apologies for the inconvenience, but it appears that Music Timer is not currently installed on your Mac. Please consider installing it to access all of its features.
`;

export default function Command() {
  const [error, setError] = useState<Error>();

  if (error) {
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Download" url="https://apps.apple.com/app/id6446814612" />
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Category">
              <Detail.Metadata.TagList.Item text="Productivity" color={"#1cd760"} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="Mac App Store"
              target="https://apps.apple.com/app/id6446814612"
              text="Download on the Mac App Store"
            />
          </Detail.Metadata>
        }
      />
    );
  } else {
    return (
      <List>
        {SESSIONS.map((item) => (
          <List.Item
            key={item.id}
            icon="list-icon.png"
            title={item.title}
            subtitle={item.subtitle}
            accessories={[{ text: item.accessory, icon: Icon.Play }]}
            actions={
              <ActionPanel>
                <Action
                  title=""
                  onAction={() =>
                    action(item.time, item.break_time).then((result) => {
                      if (!result) {
                        setError(new Error("Music Timer is not installed!"));
                      }
                    })
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }
}

async function action(time: number, break_time: number): Promise<boolean> {
  try {
    await runAppleScriptSilently(time, break_time);
    await closeMainWindow();
    return true;
  } catch (e) {
    return false;
  }
}
