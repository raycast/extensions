import { LaunchProps, List, ActionPanel, Action } from "@raycast/api";
import dayjs from "dayjs";
import { useState } from "react";
import localizedFormat from "dayjs/plugin/localizedFormat";
import utc from "dayjs/plugin/utc";

dayjs.extend(localizedFormat);

dayjs.extend(utc);

interface CurrentDateArguments {
  queryText?: string;
}

export default function (props: LaunchProps<{ arguments: CurrentDateArguments }>) {
  const { queryText } = props.arguments;

  const [inputText, setInputText] = useState<string>();
  const [currentTime, setCurrentTime] = useState<string>();

  if (inputText === undefined) {
    setInputText(queryText);
  }

  function formatTime(time: string) {
    let dTime;
    console.debug("time:" + time);
    console.debug(Number(time));
    if (!isNaN(Number(time))) {
      if (time.length == 10) {
        // is unix timestamp seconds
        dTime = dayjs.unix(Number(time));
      } else if (time.length == 13) {
        // is unix timestamp milliseconds
        dTime = dayjs(Number(time));
      } else {
        dTime = dayjs(time);
      }
    } else {
      console.debug("not a number");
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

  function onInputChange(text: string) {
    console.warn(`onInputChange: ${text}`);
    // updateInputTextAndQueryText(text, true);
    setInputText(text);
    // setSearchText(text);
    updateCurrentTime(text.trim());
  }

  function updateCurrentTime(queryText: string) {
    console.log(queryText);
    if (!queryText || queryText === "") {
      setCurrentTime(new Date().toString());
    } else if (queryText.split(" ").length > 3) {
      const parsedTime = queryText.split(" ")[0];
      const opt = queryText.split(" ")[1];
      const num = Number(queryText.split(" ")[2]);
      const freq = queryText.split(" ")[3] as dayjs.ManipulateType;
      switch (opt) {
        case "+": {
          setCurrentTime(dayjs(parsedTime).add(num, freq).format("YYYY-MM-DD"));
          break;
        }
        case "-": {
          setCurrentTime(dayjs(parsedTime).subtract(num, freq).format("YYYY-MM-DD"));
          break;
        }
      }
    } else {
      setCurrentTime(queryText);
    }
  }

  return (
    <List searchText={inputText} onSearchTextChange={onInputChange}>
      {formatTime(currentTime ? currentTime.toString() : new Date().toString()).map((time, index) => (
        <List.Item key={index} title={time.toString()} actions={<Actions item={{ content: time }} />}></List.Item>
      ))}
    </List>
  );
}
