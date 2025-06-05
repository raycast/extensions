import { List, Clipboard, Icon, ActionPanel, Action, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import advancedFormat from "dayjs/plugin/advancedFormat";
dayjs.extend(utc);
dayjs.extend(advancedFormat);
import localizedFormat from "dayjs/plugin/localizedFormat";
dayjs.extend(localizedFormat);

export default function DateConverter() {
  const [clipboardText, setClipboardText] = useState("");
  const [inputValue, setInputValue] = useState<string>(clipboardText);
  const [resultList, setResultList] = useState<string[]>([]);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    Clipboard.readText().then((text) => {
      setClipboardText(text?.toString() || "now");
    });
  });

  function dateConverter(time: string) {
    setInputValue(time);
    if (!time || time === "now") {
      const results = formateTime(new Date().toString());
      setResultList(results);
    } else {
      const dTime = dayjs(time);
      if (dTime.isValid()) {
        setResultList(formateTime(time));
      } else {
        setError(true);
        setResultList([]);
      }
    }
  }

  function formateTime(time: string): string[] {
    let dayTime: Dayjs | null = null;
    if (!isNaN(Number(time))) {
      if (time.length == 10 && Number(time) < 2000000000) {
        dayTime = dayjs.unix(Number(time));
      } else if (time.length == 13 && Number(time) < 2000000000000) {
        dayTime = dayjs(Number(time));
      } else if (time.length == 4 && Number(time) < 1970) {
        const current = dayjs(new Date());
        time = `${current.year()}${time}`;
      } else if (time.length == 6 && Number(time) < 197000) {
        const current = dayjs(new Date());
        time = `${current.year()}${time}`;
      } else if (time.length == 8 && Number(time) < 19700000) {
        const current = dayjs(new Date());
        time = `${current.year()}${time}`;
      }
    }
    if (dayTime === null) {
      const formats = ["YYYY", "YYYY-MM-DD", "YYYY MMMM DD"];
      dayTime = dayjs(time, formats, false);
    }

    const showFormats = ["YYYY-MM-DD HH:mm:ss", "X", "x"];
    const results = showFormats.map((item) => {
      return dayTime.format(item).toString();
    });
    return results;
  }

  return (
    <List
      onSearchTextChange={(text) => {
        dateConverter(text);
      }}
      searchText={inputValue}
      searchBarPlaceholder="Enter date, timestamp"
    >
      {resultList &&
        resultList.length > 0 &&
        resultList.map((time, index) => (
          <List.Item
            key={index}
            title={time.toString()}
            actions={
              <ActionPanel>
                <Action
                  title="Copy"
                  onAction={() => {
                    Clipboard.copy(time);
                    showToast({ title: `Copied ${time}` });
                  }}
                ></Action>
              </ActionPanel>
            }
          ></List.Item>
        ))}
      {!error && <List.Item key={100} title={""}></List.Item>}
      {error && (
        <List.EmptyView
          icon={{ source: Icon.Warning }}
          title="Error"
          description="Please check the date format"
        ></List.EmptyView>
      )}
    </List>
  );
}
