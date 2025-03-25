import {
  getPreferenceValues,
  getFrontmostApplication,
  openCommandPreferences,
  showToast,
  Grid,
  Detail,
  Action,
  ActionPanel,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

const { authKey, FQT } = getPreferenceValues();
const baseURL = "https://api.prntscr.com/v1/";

interface Options {
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers: { [key: string]: string };
  body: string;
}

interface Screen {
  id36: string;
  description: string;
  thumb: string;
  date: string;
  url: string;
  share_url: string;
}

interface ApiResponse {
  result: {
    screens: Screen[];
    success: boolean;
  };
}

interface UserInfo {
  result: {
    success: boolean;
    username: string;
  };
}

const options: Options = {
  method: "POST",
  headers: {
    Cookie: "__auth=" + authKey,
  },
  body: '{"jsonrpc":"2.0","method":"get_user_screens","id":1,"params":{"start_id36":0,"count":10000}}',
};

const options2: Options = {
  method: "POST",
  headers: {
    Cookie: "__auth=" + authKey,
  },
  body: '{"jsonrpc":"2.0","method":"get_userinfo","id":1,"params":{}}',
};

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSuccess, setIsSuccess] = useState<boolean>(true);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [username, setUsername] = useState<string>();
  const [frontmostApp, setFrontmostApp] = useState<{ name: string; path: string }>({ name: "", path: "" });

  async function main() {
    getFrontmostApplication().then((app) => {
      setFrontmostApp({
        name: app.path.split("/").pop()?.split(".").shift() || "",
        path: app.path,
      });
    });

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Logging in...",
    });
    fetch(baseURL, options2)
      .then((res) => res.json())
      .then((data) => {
        const userResponse = data as UserInfo;
        if (!userResponse.result.success) {
          toast.title = "Error while logging in";
          toast.style = Toast.Style.Failure;
          setIsSuccess(false);
          return;
        }
        setUsername(userResponse.result.username);
        toast.title = "Logged in successfully";
        toast.style = Toast.Style.Success;
        setTimeout(() => {
          toast.hide();
        }, 1000);
        fetch(baseURL, options)
          .then((res) => res.json())
          .then((data) => {
            const apiResponse = data as ApiResponse;
            if (!apiResponse.result.success) {
              setIsLoading(false);
              return;
            }
            setScreens(apiResponse.result.screens);
            setIsLoading(false);
          })
          .catch((error: Error) => {
            toast.title = error.message;
            toast.style = Toast.Style.Failure;
          });
      })
      .catch((error: Error) => {
        toast.title = error.message;
        toast.style = Toast.Style.Failure;
      });
  }

  async function deleteImage(id: string, screens: Screen[]) {
    const deleteOptions: Options = {
        method: "POST",
        headers: {
          Cookie: "__auth=" + authKey,
        },
        body: `{"jsonrpc":"2.0","method":"delete_screen","id":1,"params":{"id36":"${id}"}}`,
      },
      toast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting image...",
      });

    fetch(baseURL, deleteOptions)
      .then((res) => res.json())
      .then((data) => {
        const apiResponse = data as ApiResponse;
        if (!apiResponse.result.success) {
          toast.title = "Error while deleting image";
          toast.style = Toast.Style.Failure;
          return;
        }
        setScreens(screens.filter((screen: Screen) => screen.id36 !== id));
        toast.title = "Image deleted successfully";
        toast.style = Toast.Style.Success;
      })
      .catch((error: Error) => {
        toast.title = error.message;
        toast.style = Toast.Style.Failure;
      });
  }

  useEffect(() => {
    main().then((r) => r);
  }, []);

  return isSuccess ? (
    <Grid
      searchBarPlaceholder={
        screens.length !== 0
          ? "Search an image using its publishing date or description"
          : "There's currently nothing to search for"
      }
      columns={4}
      isLoading={isLoading}
      navigationTitle={username ? `Logged in as ${username}` : "Logging in..."}
    >
      {screens.length === 0 ? (
        <Grid.EmptyView
          icon={Icon.Globe}
          title="No images found"
          description={"Try uploading something first!"}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title={"Open prnt.sc"} url={"https://prnt.sc/gallery.html"} />
            </ActionPanel>
          }
        />
      ) : (
        screens.map((screen: Screen) => (
          <Grid.Item
            content={!FQT ? screen.thumb : screen.url}
            key={screen.id36}
            title={screen.date}
            subtitle={screen.description || "No Title"}
            keywords={screen.description ? [screen.description, screen.id36] : [screen.id36]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title={"Direct URL"}>
                  <Action.CopyToClipboard content={screen.url} />
                  <Action.Paste
                    title={`Paste to ${frontmostApp?.name || "Active App"}`}
                    icon={{ fileIcon: frontmostApp.path }}
                    content={screen.url}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title={"Other"}>
                  <Action.OpenInBrowser
                    title="Open In Browser"
                    url={screen.share_url}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <ActionPanel.Item
                    title="Delete Image From Gallery"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    style={Action.Style.Destructive}
                    onAction={() => deleteImage(screen.id36, screens)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  ) : (
    <Detail
      markdown="## Something went wrong. Your auth key must be the problem. Follow these instructions to get your auth key:
- Open [prnt.sc](https://prnt.sc)
- Make sure to be logged into your account
- Open the developer tools of your browser (mostly `Cmd + Option + I`)
- Go in the Application or Storage tab of thre developer tools
- Click on the cookies and search for a cookie named `__auth`
#### 🎉 This is your Auth Key! You can enter this in the extension preferences.
📌 Start by pressing `↩︎ Enter` to open the preferences.

Note: logging out of [prnt.sc](https://prnt.sc) in the browser you used to retrieve the auth key will also log you out in this extension"
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Command Preferences" onAction={openCommandPreferences} />
        </ActionPanel>
      }
    />
  );
}
