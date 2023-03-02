import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { format, getTranslateUrl, getCommand, isStartWithCommand } from "./utils";

interface TranslateWebResult {
  value: Array<string>;
  key: string;
}

interface TranslateResult {
  translation?: Array<string>;
  basic?: { phonetic?: string; explains?: Array<string> };
  web?: Array<TranslateWebResult>;
  errorCode: string;
}

function translateAPI(q: string) {
  const url = getTranslateUrl(q);

  return fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

function formatTranslateResult(translateResult: TranslateResult, prefix: string) {
  const result: string[] = [];
  const reg = /^[a-zA-Z ]/;
  const { translation, basic, web } = translateResult;

  translation?.forEach((item) => {
    if (reg.test(item)) {
      result.push(format(item, prefix));
    }
  });
  basic?.explains?.forEach((item) => {
    if (reg.test(item)) {
      result.push(format(item, prefix));
    }
  });
  web?.forEach((item) => {
    item.value?.forEach((i) => {
      if (reg.test(i)) {
        result.push(format(i, prefix));
      }
    });
  });

  return [...new Set(result)];
}

function TranslateResultActionPanel(props: { copyContent: string }) {
  const { copyContent } = props;
  return (
    <ActionPanel>
      <Action.CopyToClipboard content={copyContent} />
    </ActionPanel>
  );
}

export default function Command() {
  const [isLoading, setLoadingStatus] = useState(false);
  const [inputText, setInputText] = useState("");
  const [translateResult, setTranslateResult] = useState<string[]>([]);

  useEffect(() => {
    if (!isStartWithCommand(inputText)) return;

    const searchText = inputText.substring(3).trim();

    if (!searchText) return;

    (async () => {
      setLoadingStatus(true);
      const response = await translateAPI(searchText);
      setTranslateResult(
        formatTranslateResult(((await response.json()) as TranslateResult) || {}, getCommand(inputText))
      );
      setLoadingStatus(false);
    })();
  }, [inputText]);

  return (
    <List
      searchBarPlaceholder="Enter your desired variable name"
      onSearchTextChange={setInputText}
      isLoading={isLoading}
      throttle
    >
      {translateResult?.map((item, index) => (
        <List.Item
          key={index}
          title={item}
          icon={{ source: Icon.Dot, tintColor: Color.Red }}
          actions={<TranslateResultActionPanel copyContent={item} />}
        />
      ))}
    </List>
  );
}
