import { useEffect, useState } from "react";
import { List, Clipboard, Icon } from "@raycast/api";
import TsListItem from "./tsItem";
import moment from "moment";

import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  format: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [clipboardText, setClipboardText] = useState("");
  const [format, setFormat] = useState("YYYY-MM-DD HH:mm:ss");
  const [offset, setOffset] = useState("");

  const readClipboard = async () => {
    const text = await Clipboard.readText();
    console.debug(`read from clipboard: ${text}`);
    setClipboardText(text ?? "");
  };

  useEffect(() => {
    const offset = -new Date().getTimezoneOffset() / 60;
    if (offset >= 0) {
      setOffset(`UTC+${offset}`);
    } else {
      setOffset(`UTC${offset}`);
    }
    console.debug(`local timezone offset: ${setOffset}`);

    const preferences = getPreferenceValues<Preferences>();
    console.debug("preferences", preferences);
    setFormat(preferences.format);
    console.debug(`format: ${format}`);
    readClipboard();
  }, []);

  const renderParsedTimestamp = () => {
    let inputTimestampStr = "";
    let fromClipboard = false;
    if (searchText.match(/^\d+$/)) {
      inputTimestampStr = searchText;
      fromClipboard = false;
    } else if (clipboardText.match(/^\d+$/)) {
      inputTimestampStr = clipboardText;
      fromClipboard = true;
    } else {
      return null;
    }

    let inputMoment: moment.Moment;

    // 如果长度小于等于10，认为时间戳的单位是秒。
    // 如果长度大于10，认为时间戳的单位是毫秒
    if (inputTimestampStr.length <= 10) {
      inputMoment = moment(Number(inputTimestampStr) * 1000);
    } else {
      inputMoment = moment(Number(inputTimestampStr));
    }

    const icon = fromClipboard ? Icon.Clipboard : Icon.TextInput;
    return (
      <List.Section title={`From ${fromClipboard ? "clipboard" : "input"}`}>
        <TsListItem
          title={inputMoment.format(format)}
          subtitle={`Local time (${offset}) for ${inputTimestampStr}`}
          icon={icon}
        ></TsListItem>
        <TsListItem
          title={inputMoment.utc().format(format)}
          subtitle={`UCT+0 time for ${inputTimestampStr}`}
          icon={icon}
        ></TsListItem>
      </List.Section>
    );
  };

  const renderCurrentTime = () => {
    const currentTimestampList = [
      moment().unix().toString(),
      moment().valueOf().toString(),
      moment().format(format),
      moment().utc().format(format),
    ];

    return (
      <List.Section title="Current time">
        <TsListItem title={currentTimestampList[0]} subtitle={`Current timestamp (s)`} icon={Icon.Clock}></TsListItem>
        <TsListItem title={currentTimestampList[1]} subtitle={`Current timestamp (ms)`} icon={Icon.Clock}></TsListItem>
        <TsListItem
          title={currentTimestampList[2]}
          subtitle={`Current local (${offset}) date `}
          icon={Icon.Clock}
        ></TsListItem>
        <TsListItem title={currentTimestampList[3]} subtitle="Current UTC+0 date" icon={Icon.Globe}></TsListItem>
      </List.Section>
    );
  };

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Beers"
      searchBarPlaceholder="Enter timestamp..."
    >
      {renderParsedTimestamp()}
      {renderCurrentTime()}
    </List>
  );
}
