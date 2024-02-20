import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useCallback } from "react";
import { CookieEdit } from "./CookieEdit";

export function ListView({ cookies }: { cookies: Record<string, string> }) {
  const [cookiesList, setCookiesList] = useState<Record<string, string>>(cookies);
  const handleSearch = useCallback((searchText: string) => {
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
      onSearchTextChange={handleSearch}
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
                icon={Icon.Pencil}
                title="Edit Item"
                target={
                  <CookieEdit
                    onEdit={(editedCookies) => {
                      setCookiesList(editedCookies);
                    }}
                    cookies={cookies}
                    cookieToEdit={{
                      key,
                      value,
                    }}
                  />
                }
              />
              <Action.CopyToClipboard
                title={"Copy All As Text"}
                content={Object.entries(cookies)
                  .map(([key, value]) => `${key}=${value}`)
                  .join("; ")}
              />
              <Action.CopyToClipboard title={"Copy All As Object"} content={JSON.stringify(cookies, null, 2)} />
              <Action.CopyToClipboard title="Copy Item As Text" content={`${key}=${value}`} />
              <Action.CopyToClipboard
                title="Copy Item As Object"
                content={`{
                  ${key}: ${value},
                }`}
              />
              <Action
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                title="Delete Item"
                onAction={() => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { [key]: _, ...rest } = cookies;
                  setCookiesList(rest);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
