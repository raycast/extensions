import { Action, ActionPanel, List, useNavigation, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getHue } from "./utils";
import { Hue } from "./types";
import HueDetail from "./components/hue-detail";

export default function Command() {
  const { push } = useNavigation();
  const [hues, setHues] = useState<Hue[]>([]);

  const { isLoading } = useCachedPromise(async () => {
    const hues = await getHue();
    setHues(hues as Hue[]);
  });

  return (
    <List isLoading={isLoading}>
      {hues.map((hue) => (
        <List.Item
          key={hue.name}
          title={hue.name}
          icon={{ source: "extension-icon.png" }}
          accessories={[
            {
              tooltip: hue.colors[0],
              icon: {
                source: `https://hue-palette.zeabur.app/hue-color-image/${hue.colors[0].replace("#", "")}`,
              },
            },
            {
              tooltip: hue.colors[1],
              icon: {
                source: `https://hue-palette.zeabur.app/hue-color-image/${hue.colors[1].replace("#", "")}`,
              },
            },
            {
              tooltip: hue.colors[2],
              icon: {
                source: `https://hue-palette.zeabur.app/hue-color-image/${hue.colors[2].replace("#", "")}`,
              },
            },
            {
              tooltip: hue.colors[3],
              icon: {
                source: `https://hue-palette.zeabur.app/hue-color-image/${hue.colors[3].replace("#", "")}`,
              },
            },
            {
              tooltip: hue.colors[4],
              icon: {
                source: `https://hue-palette.zeabur.app/hue-color-image/${hue.colors[4].replace("#", "")}`,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Show Hue Details"
                icon={Icon.List}
                onAction={() => {
                  push(<HueDetail {...hue} />);
                }}
              />
              <Action.OpenInBrowser
                title="Open Hue in Browser"
                url={"https://www.hue-palette.com/" + hue.name}
                icon={Icon.AppWindow}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
