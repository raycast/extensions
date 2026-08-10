import { useState } from "react";

import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { DictDetail } from "./DictDetail";

import { useDebouncedValue } from "../logic/hooks";

import { WordData } from "../logic/types";

export const Main = () => {
  const { apiKey } = getPreferenceValues();
  const [isShowingDetail] = useState(true);
  const [input, setInput] = useState("");

  const debouncedText = useDebouncedValue(input, 500);

  const { data: result, isLoading } = useFetch<WordData, null>(
    `https://pedia.cloud.edu.tw/api/v2/Detail?term=${debouncedText}&api_key=${apiKey}`,
    {
      keepPreviousData: true,
      execute: debouncedText.length > 0,
      mapResult: (data) => ({ data }),
      initialData: null,
    },
  );

  const heteronyms = result
    ? Object.hasOwn(result, "revised_dict")
      ? result.revised_dict.heteronyms
      : result.concise_dict.heteronyms
    : null;

  return (
    <List
      throttle
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchText={input}
      onSearchTextChange={setInput}
    >
      {result != null ? (
        <List.Item
          title={result.title}
          accessories={[{ text: result.Field }]}
          detail={heteronyms != null ? <DictDetail heteronyms={heteronyms} /> : null}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser
                  title="Open in Web"
                  shortcut={{ modifiers: ["opt"], key: "enter" }}
                  url={`https://pedia.cloud.edu.tw/Entry/Detail?title=${encodeURIComponent(result.title)}`}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
};
