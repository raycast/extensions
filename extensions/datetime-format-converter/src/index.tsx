import {
  List,
  ActionPanel,
  Action,
  Clipboard,
  Icon,
  Color,
  getPreferenceValues,
  openCommandPreferences,
  LocalStorage,
} from "@raycast/api";
import React, { useState } from "react";
import dayjs, { Dayjs } from "dayjs";

import advancedFormat from "dayjs/plugin/advancedFormat";
dayjs.extend(advancedFormat);

import localizedFormat from "dayjs/plugin/localizedFormat";
dayjs.extend(localizedFormat);

import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

interface Values {
  format: string;
}

export default function main() {
  const [clipboardText, setClipboardText] = useState("");
  const [input, setInput] = useState<string>(clipboardText);
  const [resultList, setResultList] = useState([] as string[]);
  const [customResultList, setCustomResultList] = useState([] as string[]);
  const [validFormat, setValidFormat] = useState<boolean>(false);
  const [customDatetimeFormats, setCustomDatetimeFormats] = useState<Record<string, string>>({});

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
    Clipboard.readText().then((text) => {
      setClipboardText(text?.toString() || "");
    });

    const loadFormats = async () => {
      const items = await LocalStorage.allItems<Values>();

      const savedFormatsObject = Object.fromEntries(
        Object.entries(items)
          .sort(([keyA], [keyB]) => Number(keyA.split("_")[1]) - Number(keyB.split("_")[1]))
          .map(([key, value]) => [key, String(value)])
      ) as Record<string, string>;

      setCustomDatetimeFormats(savedFormatsObject);
    };
    loadFormats();
  }, []);

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
      setResultList(formatTime(new Date().toString(), dateTimeFormats));
      setCustomResultList(formatTime(new Date().toString(), customDatetimeFormats));
    } else {
      const dTime = dayjs(time);
      if (dTime.isValid()) {
        setResultList(formatTime(time, dateTimeFormats));
        setCustomResultList(formatTime(time, customDatetimeFormats));
      } else {
        setValidFormat(false);
        setResultList([]);
        setCustomResultList([]);
      }
    }
  }

  function formatTime(time: string, formats: Record<string, string>) {
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

    return Object.entries(formats)
      .filter(([key]) => preferences[key] !== false)
      .map(([, value]) => dTime.format(value).toString());
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
      {customResultList && customResultList.length > 0 && (
        <List.Section title="Custom Formats">
          {customResultList.map((time, index) => (
            <List.Item key={`custom-${index}`} title={time.toString()} actions={<Actions item={{ content: time }} />} />
          ))}
        </List.Section>
      )}

      {resultList && resultList.length > 0 && (
        <List.Section title="Default Formats">
          {resultList.map((time, index) => (
            <List.Item key={index} title={time.toString()} actions={<Actions item={{ content: time }} />} />
          ))}
        </List.Section>
      )}

      {(!validFormat || (!customResultList?.length && !resultList?.length)) && (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          title={!validFormat ? "An error occurred" : "No Date Time Format is selected in preferences"}
          description={!validFormat ? "This is not a time format." : "Press ↵ to Open Extension Preferences"}
          actions={
            !validFormat ? undefined : (
              <ActionPanel>
                <Action title="Open Extension Preferences" onAction={openCommandPreferences} />
              </ActionPanel>
            )
          }
        />
      )}
    </List>
  );
}
