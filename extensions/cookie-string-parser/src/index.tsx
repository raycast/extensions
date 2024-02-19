import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { useCallback, useState } from "react";
import { default as cookiesParser } from "cookie-parse";

export default function Command() {
  const [cookies, setCookies] = useState<Record<string, string>>({});
  const onSearchTextChange = useCallback((searchText: string) => {
    if (!searchText.trim()) {
      setCookies({});
      return;
    }
    setCookies(cookiesParser.parse(searchText));
  }, []);

  return (
    <List
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder="Foo=; Bar="
      searchBarAccessory={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy All" content={JSON.stringify(cookies, null, 2)} />
        </ActionPanel>
      }
    >
      {Object.entries(cookies).map(([key, value]) => (
        <List.Item
          icon={Icon.Text}
          key={key}
          title={key}
          subtitle={value}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<Detail markdown={`## ${key} \n --- \n ${value}`} />} />
              <Action.CopyToClipboard
                title="Copy Item"
                content={`{
                  ${key}: ${value},
                }`}
              />
              <Action.CopyToClipboard title={"Copy All"} content={JSON.stringify(cookies, null, 2)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
