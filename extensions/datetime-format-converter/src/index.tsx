import { List, ActionPanel, Action, Clipboard, Icon, Color } from "@raycast/api";
import React, { useState } from "react";
import dayjs from "dayjs";

import localizedFormat from "dayjs/plugin/localizedFormat";
dayjs.extend(localizedFormat);
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

export default function main() {
  const [clipboardText, setClipboardText] = useState("");
  const [input, setInput] = useState<string>(clipboardText);
  const [resultList, setResultList] = useState([] as string[]);

  React.useEffect(() => {
    Clipboard.readText().then((text) => {
      setClipboardText(text?.toString() || "");
    });
  });

  React.useEffect(() => {
    const _input = input || clipboardText;
    console.log("input: " + _input);
    setInput(_input);
    if (_input) {
      timeConverter(_input);
    }
  }, [clipboardText]);

  function timeConverter(time: string) {
    setInput(time);
    if (!time || time === "now") {
      setResultList(formatTime(new Date().toString()));
    } else {
      const dTime = dayjs(time);
      if (dTime.isValid()) {
        setResultList(formatTime(time));
      } else {
        setResultList([]);
      }
    }
  }

  function formatTime(time: string) {
    let dTime;
    if (!isNaN(Number(time))) {
      if (time.length == 10) {
        // is unix timestamp seconds
        dTime = dayjs.unix(Number(time));
      } else if (time.length == 13) {
        // is unix timestamp milliseconds
        dTime = dayjs(Number(time));
      } else {
        return [];
      }
    } else {
      dTime = dayjs(time);
    }

    return [
      // ISO 8601 or similar
      dTime.format("YYYY-MM-DD").toString(),
      dTime.format("YYYY-MM-DD HH:mm:ss").toString(),
      dTime.format("YYYY-MM-DD HH:mm:ss.SSS").toString(),
      dTime.format("YYYY-MM-DD HH:mm:ssZ").toString(),
      dTime.format().toString(),
      dTime.utc().format().toString(),

      // Unix timestamps
      dTime.unix().toString(),
      dTime.valueOf().toString(),

      // Localized formats
      dTime.format("L").toString(),
      dTime.format("L LT").toString(),
      dTime.format("LLL").toString(),
      dTime.format("LLLL").toString(),
      dTime.format("LT").toString(),
      dTime.format("LTS").toString(),
    ];
  }

  type ActionItem = {
    item: {
      content: string;
    };
  };

  function Actions({ item }: ActionItem) {
    return (
      <ActionPanel>
        <Action.CopyToClipboard content={item.content} />
        <Action.Paste content={item.content} />
      </ActionPanel>
    );
  }

  return (
    <List
      onSearchTextChange={(text) => timeConverter(text)}
      searchText={input}
      searchBarPlaceholder="Enter a time or date"
    >
      {resultList && resultList.length > 0 ? (
        resultList.map((time, index) => (
          <List.Item key={index} title={time.toString()} actions={<Actions item={{ content: time }} />}></List.Item>
        ))
      ) : (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          title="An error occurred"
          description="This is not a time format."
        />
      )}
    </List>
  );
}
