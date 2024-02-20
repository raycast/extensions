import { List, ActionPanel, Action, Icon, Detail } from "@raycast/api";
import { useState, useCallback } from "react";
import { CookieEdit } from "./CookieEdit";

export function ListView({ cookies }: { cookies: Record<string, string> }) {
  const [cookiesList, setCookiesList] = useState<Record<string, string>>(cookies);
  const onSearchTextChange = useCallback((searchText: string) => {
    if (!searchText.trim()) {
      setCookiesList(cookies);
      return;
    }
    // filter the cookies by the search text
    setCookiesList(
      Object.fromEntries(
        Object.entries(cookies).filter(([key, value]) => {
          return (
            key.toLowerCase().includes(searchText.toLowerCase()) ||
            value.toLowerCase().includes(searchText.toLowerCase())
          );
        }),
      ),
    );
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
      {Object.entries(cookiesList).map(([key, value]) => (
        <List.Item
          icon={Icon.Text}
          key={key}
          title={key}
          subtitle={value}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Item"
                target={
                  <CookieEdit
                    cookies={cookies}
                    cookieToEdit={{
                      key,
                      value,
                    }}
                  />
                }
              />
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
