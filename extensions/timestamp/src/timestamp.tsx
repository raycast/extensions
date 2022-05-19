import { Action, ActionPanel, List } from "@raycast/api";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

export default function Command() {
  const [input, setInput] = useState("");
  const [time, setTime] = useState<dayjs.Dayjs>(dayjs());
  const [results, setResults] = useState(["", ""]);

  useEffect(() => {
    const cleanInput = input.trim();
    if (cleanInput !== "") {
      if (cleanInput.match(/^\d+\.?\d*$/)) {
        setTime(dayjs.unix(parseFloat(cleanInput)));
      } else {
        setTime(dayjs(cleanInput));
      }
    } else {
      setTime(dayjs());
    }

    setResults([
      time.format(),
      time.format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
      time.format("YYYY-MM-DD HH:mm:ss"),
      time.format("YYYY-MM-DD HH:mm:ss.SSS"),
    ]);
  }, [input]);

  return (
    <List
      enableFiltering={false}
      onSearchTextChange={setInput}
      searchBarPlaceholder="a timestamp or formatted time"
      navigationTitle="Timestamp Convert"
    >
      <List.Section title="Unix Timestamp">
        <List.Item
          title={`${time.unix()}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={time.unix()} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Human Readable">
        {results.map((item, idx) => {
          return (
            <List.Item
              key={idx}
              title={item}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={item} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
