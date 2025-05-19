import { useEffect, useState } from "react";
import { Action, ActionPanel, Clipboard, getSelectedText, List, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { translateAPI } from "./apis/translate";
import { TranslateResult } from "../types";
import { LANGUAGES } from "./consts";
import { ErrorMessage } from "./components/error_message";
import { generateErrorMessage } from "./utils";

export default function Command() {
  const { push } = useNavigation();
  const [to, setTo] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [translateList, setTranslateList] = useCachedState<Array<TranslateResult>>("translateList", []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const text = (await Promise.allSettled([getSelectedText(), Clipboard.readText()])).filter(
        (item) => item.status === "fulfilled"
      ) as PromiseFulfilledResult<string>[];

      if (text.length && text[0].value && !translateList.some((item) => item.query === text[0].value)) {
        const res = await translateAPI(text[0].value, "auto", to);
        if (!res) return;
        if (res.errorCode !== "0") {
          push(<ErrorMessage errorMessage={generateErrorMessage(res.errorCode)} />);
          return;
        }
        setTranslateList((prev) => {
          return [res, ...prev];
        });
      }

      setLoading(false);
    })();
  }, []);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      isLoading={loading}
      navigationTitle="Quickly Translate"
      searchBarPlaceholder="Search for translation..."
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Select Language to Translate" onChange={setTo} storeValue>
          {Object.keys(LANGUAGES).map((key: string) => (
            <List.Dropdown.Item key={key} value={LANGUAGES[key as keyof typeof LANGUAGES]} title={key} />
          ))}
        </List.Dropdown>
      }
      throttle
    >
      {translateList.map((item) => (
        <List.Item
          title={item.query}
          detail={<List.Item.Detail markdown={item.translation?.join("") ?? ""} />}
          actions={
            <ActionPanel title="Translate">
              <Action
                title="Translate"
                onAction={async () => {
                  if (!searchText) return;
                  setLoading(true);

                  try {
                    const res = await translateAPI(searchText, "auto", to);
                    if (!res) return;
                    if (res.errorCode !== "0") {
                      push(<ErrorMessage errorMessage={generateErrorMessage(res.errorCode)} />);
                      return;
                    }
                    setTranslateList((prev) => {
                      return [res, ...prev];
                    });
                    setSearchText("");
                  } finally {
                    setLoading(false);
                  }
                }}
              />
              <Action.CopyToClipboard
                title="Copy"
                content={item.translation?.join("") ?? ""}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
