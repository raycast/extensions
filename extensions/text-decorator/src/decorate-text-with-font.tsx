// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import utd from "unicode-text-decorator";
import { Action, ActionPanel, Color, getPreferenceValues, Grid, Icon, Image, List, LocalStorage } from "@raycast/api";
import React, { useState } from "react";
import { EmptyView } from "./components/empty-view";
import { fontFamily, LocalStorageKey } from "./utils/constants";
import { getStarTextFont } from "./hooks/hooks";
import { decorateText } from "./decorate-text";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { Preferences } from "./types/preferences";
import { ActionOnFont } from "./components/action-on-font";

export default function DecorateTextWithFont() {
  const { itemLayout, itemSize } = getPreferenceValues<Preferences>();
  const [refresh, setRefresh] = useState<number>(0);

  const { starTextFont } = getStarTextFont(refresh);

  return itemLayout === "List" ? (
    <List searchBarPlaceholder={"Search fonts"}>
      <EmptyView layout={itemLayout} />
      {fontFamily.map((value) => {
        return (
          <List.Item
            key={value.value}
            icon={{ source: "list-icons/" + value.icon }}
            title={value.title}
            subtitle={utd.decorate("Unicode", value.value, { fallback: true })}
            accessories={[
              starTextFont === value.value
                ? {
                    icon: { source: Icon.Star, tintColor: Color.Yellow },
                    tooltip: "Default font of 𝐃𝐞𝐜𝐨𝐫𝐚𝐭𝐞 𝐓𝐞𝐱𝐭 command",
                  }
                : {},
            ]}
            actions={<ActionOnFont font={value} setRefresh={setRefresh} />}
          />
        );
      })}
    </List>
  ) : (
    <Grid searchBarPlaceholder={"Search fonts"} itemSize={itemSize as Grid.ItemSize}>
      <EmptyView layout={itemLayout} />
      {fontFamily.map((value) => {
        return (
          <Grid.Item
            key={value.value}
            content={{
              source: "grid-icons/" + value.icon,
              tintColor: starTextFont === value.value ? Color.Yellow : undefined,
              tooltip: starTextFont === value.value ? "Default font of 𝐃𝐞𝐜𝐨𝐫𝐚𝐭𝐞 𝐓𝐞𝐱𝐭 command" : undefined,
            }}
            title={value.title}
            actions={<ActionOnFont font={value} setRefresh={setRefresh} />}
          />
        );
      })}
    </Grid>
  );
}
