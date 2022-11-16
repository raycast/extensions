// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import utd from "unicode-text-decorator";
import { Color, getPreferenceValues, Grid, List } from "@raycast/api";
import React, { useState } from "react";
import { EmptyView } from "./components/empty-view";
import { fontFamily } from "./utils/constants";
import { getInputItem, getIsShowDetail, getStarTextFont } from "./hooks/hooks";
import { Preferences } from "./types/preferences";
import { ActionOnFont } from "./components/action-on-font";

export default function DecorateTextWithFont() {
  const { itemLayout, itemSize } = getPreferenceValues<Preferences>();
  const [refresh, setRefresh] = useState<number>(0);

  const { showDetail, detailLoading } = getIsShowDetail(refresh);
  const { inputItem, itemLoading } = getInputItem(refresh);
  const { starTextFont, starLoading } = getStarTextFont(refresh);

  return itemLayout === "List" ? (
    <List
      isLoading={detailLoading || itemLoading || starLoading}
      searchBarPlaceholder={"Search fonts, *font is the default font of 𝐃𝐞𝐜𝐨𝐫𝐚𝐭𝐞 𝐓𝐞𝐱𝐭 command"}
      isShowingDetail={showDetail}
    >
      <EmptyView layout={itemLayout} />
      {fontFamily.map((value) => {
        return (
          <List.Item
            key={value.value}
            icon={{ source: "list-icons/" + value.icon }}
            title={
              starTextFont === value.value
                ? {
                    value: "*" + utd.decorate(value.title, fontFamily[0].value, { fallback: true }),
                    tooltip: "Default font of 𝐃𝐞𝐜𝐨𝐫𝐚𝐭𝐞 𝐓𝐞𝐱𝐭 command",
                  }
                : value.title
            }
            detail={<List.Item.Detail markdown={`${utd.decorate(inputItem, value.value, { fallback: true })}`} />}
            subtitle={utd.decorate("Unicode", value.value, { fallback: true })}
            actions={<ActionOnFont font={value} layout={itemLayout} showDetail={showDetail} setRefresh={setRefresh} />}
          />
        );
      })}
    </List>
  ) : (
    <Grid
      isLoading={detailLoading || itemLoading || starLoading}
      searchBarPlaceholder={"Search fonts, *font is the default font of 𝐃𝐞𝐜𝐨𝐫𝐚𝐭𝐞 𝐓𝐞𝐱𝐭 command"}
      itemSize={itemSize as Grid.ItemSize}
    >
      <EmptyView layout={itemLayout} />
      {fontFamily.map((value) => {
        return (
          <Grid.Item
            key={value.value}
            content={{
              value: {
                source: "grid-icons/" + value.icon,
                tintColor:
                  value.value !== "regional_indicator"
                    ? starTextFont === value.value
                      ? Color.Yellow
                      : Color.PrimaryText
                    : undefined,
              },
              tooltip: starTextFont === value.value ? "Default font of 𝐃𝐞𝐜𝐨𝐫𝐚𝐭𝐞 𝐓𝐞𝐱𝐭 command" : "",
            }}
            title={
              starTextFont === value.value
                ? "*" + utd.decorate(value.title, fontFamily[0].value, { fallback: true })
                : value.title
            }
            actions={<ActionOnFont font={value} layout={itemLayout} showDetail={showDetail} setRefresh={setRefresh} />}
          />
        );
      })}
    </Grid>
  );
}
