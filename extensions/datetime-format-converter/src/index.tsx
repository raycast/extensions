import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  getPreferenceValues,
  Icon,
  List,
  openCommandPreferences,
} from "@raycast/api";
import dayjs, { Dayjs } from "dayjs";
import React, { useState } from "react";

import advancedFormat from "dayjs/plugin/advancedFormat";
dayjs.extend(advancedFormat);

import localizedFormat from "dayjs/plugin/localizedFormat";
dayjs.extend(localizedFormat);

import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

export default function main() {
  const [clipboardText, setClipboardText] = useState("");
  const [input, setInput] = useState<string>(clipboardText);
  const [resultList, setResultList] = useState([] as string[]);
  const [validFormat, setValidFormat] = useState<boolean>(false);

  const dateTimeFormats = {
    isoDate: "YYYY-MM-DD",
    isoDateTime: "YYYY-MM-DD HH:mm:ss",
    formatWithMillis: "YYYY-MM-DD HH:mm:ss.SSS",
    formatWithTimezone: "YYYY-MM-DD HH:mm:ssZ",
    isoFormat: "YYYY-MM-DDTHH:mm:ssZ",
    utcIsoFormat: "YYYY-MM-DDTHH:mm:ss[Z]",
    unixTimestamp: "X",
    unixMillis: "x",
    localizedShortDate: "L",
    localizedShortDateTime: "L LT",
    localizedFullDateTime: "LLL",
    localizedLongDateTime: "LLLL",
    localizedTime: "LT",
    localizedSecondsTime: "LTS",
  };

  const preferences = getPreferenceValues();

  React.useEffect(() => {
    if (preferences.autoPasteClipboard) {
      Clipboard.readText().then((text) => {
        setClipboardText(text?.toString() || "");
      });
    }
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
    setValidFormat(true);
    if (!time || time === "now") {
      setResultList(formatTime(new Date().toString()));
    } else {
      const dTime = dayjs(time);
      if (dTime.isValid()) {
        setResultList(formatTime(time));
      } else {
        setValidFormat(false);
        setResultList([]);
      }
    }
  }

  function formatTime(time: string) {
    let dTime: Dayjs;
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

    return Object.entries(dateTimeFormats)
      .filter(([key]) => preferences[key])
      .map(([key, value]) =>
        key === "utcIsoFormat" ? dTime.utc().format(value).toString() : dTime.format(value).toString()
      );
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
      ) : !validFormat ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          title="An error occurred"
          description="This is not a time format."
        />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          title="No Date Time Format is selected in preferences"
          description="press ↵ to Open Extension Preferences"
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
