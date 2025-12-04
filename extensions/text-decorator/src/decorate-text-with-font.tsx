import { Grid, List } from "@raycast/api";
import React, { useState } from "react";
import { EmptyView } from "./components/empty-view";
import { fontFamily, SEARCH_PLACEHOLDER } from "./utils/constants";
import { useInputItem, useIsShowDetail } from "./hooks/hooks";
import { ActionOnFont } from "./components/action-on-font";
import { decorate } from "./unicode-db/unicode-text-decorator";
import { columns, fontFallback, itemLayout } from "./types/preferences";

export default function DecorateTextWithFont() {
  const [refresh, setRefresh] = useState<number>(0);
  const { showDetail } = useIsShowDetail(refresh);
  const { inputItem, itemLoading } = useInputItem(refresh);
  const [decoratedText, setDecoratedText] = useState<string>(inputItem);

  return itemLayout === "List" ? (
    <List isLoading={itemLoading} searchBarPlaceholder={SEARCH_PLACEHOLDER} isShowingDetail={showDetail}>
      <EmptyView />
      {fontFamily.map((value) => {
        return (
          <List.Item
            id={value.value}
            key={value.value}
            icon={{ source: "list-icons/" + value.icon }}
            title={value.title}
            detail={<List.Item.Detail markdown={decorate(inputItem, value.value, { fallback: fontFallback })} />}
            accessories={[{ text: decorate(value.title, value.value, { fallback: fontFallback }) }]}
            actions={<ActionOnFont font={value} layout={itemLayout} showDetail={showDetail} setRefresh={setRefresh} />}
          />
        );
      })}
    </List>
  ) : (
    <Grid
      isLoading={itemLoading}
      searchBarPlaceholder={SEARCH_PLACEHOLDER}
      columns={parseInt(columns)}
      onSelectionChange={(font) => {
        let decoratedText: string;
        if (font) {
          decoratedText = decorate(inputItem, font, { fallback: fontFallback });
        } else {
          decoratedText = decorate(inputItem, fontFamily[0].value, { fallback: fontFallback });
        }
        setDecoratedText(decoratedText);
      }}
    >
      <EmptyView />
      <Grid.Section title={!itemLoading ? `✨ ${decoratedText}` : "✨"}>
        {fontFamily.map((value) => {
          return (
            <Grid.Item
              id={value.value}
              key={value.value}
              content={{
                value: {
                  source: "grid-icons/" + value.icon,
                },
                tooltip: "",
              }}
              title={value.title}
              actions={
                <ActionOnFont font={value} layout={itemLayout} showDetail={showDetail} setRefresh={setRefresh} />
              }
            />
          );
        })}
      </Grid.Section>
    </Grid>
  );
}
