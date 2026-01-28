import { List, ActionPanel, Action, Icon, LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { CookieEdit } from "./CookieEdit";
import { toCookiesObject } from "./utils";

export default function Command({ arguments: { cookies } }: LaunchProps<{ arguments: Arguments.Index }>) {
  const [cookiesList, setCookiesList] = useState<Record<string, string>>();
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const hasCookies = Object.keys(cookiesList || {}).length > 0;

    if (hasCookies) {
      return;
    }
    const cookies_ = toCookiesObject(cookies);
    // check if cookies_ is not empty or have a value of {undefined: undefined}
    const isEmpty = Object.keys(cookies_).length === 0;
    if (isEmpty) {
      showToast({
        title: "No cookies found",
        message: "Please provide a valid cookie string",
        style: Toast.Style.Failure,
      });

      return;
    }
    setCookiesList(cookies_);
    setIsLoading(false);
  }, []);
  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy All" content={JSON.stringify(cookiesList, null, 2)} />
        </ActionPanel>
      }
    >
      {cookiesList &&
        Object.entries(cookiesList).map(([key, value]) => (
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
                      cookies={cookiesList}
                      cookieToEdit={{
                        key,
                        value,
                      }}
                    />
                  }
                />
                <Action.CopyToClipboard
                  title={"Copy All As Text"}
                  content={Object.entries(cookiesList)
                    .map(([key, value]) => `${key}=${value}`)
                    .join("; ")}
                />
                <Action.CopyToClipboard title={"Copy All As Object"} content={JSON.stringify(cookiesList, null, 2)} />
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
                    const { [key]: _, ...rest } = { ...cookiesList };
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
