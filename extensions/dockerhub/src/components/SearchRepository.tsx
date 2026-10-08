import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { ListReposResponse, UserInfo } from "../lib/hub/types";
import { getToken, saveToken } from "../lib/hub/storage";
import { Hub, TwoFactorDetailMessage } from "../lib/hub/hub";
import SearchTags from "./SearchTags";

export const initHub = async (signal?: AbortSignal): Promise<Hub | undefined> => {
  try {
    const pref = getPreferenceValues();
    if (!pref.username || !pref.password) {
      showToast({
        style: Toast.Style.Failure,
        title: "Incomplete Preferences",
        message: "Username or password is required",
      });
      return;
    }

    const hub = new Hub(pref.username, pref.password);
    const token = await getToken();
    if (token) {
      return hub;
    }

    const resp = await hub.login(signal);
    if (resp.token) {
      await saveToken(resp.token);
      return hub;
    }

    if (resp.detail === TwoFactorDetailMessage) {
      if (!resp.login_2fa_token) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid Login 2FA Token",
          message: `Login 2FA Token not found in the response: ${resp}`,
        });
        return hub;
      }
      if (!pref.twoFactorCode) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid 2FA Code",
          message: "Please update 2FA Code in the preferences",
        });
        return;
      }

      const twoFactorLoginResp = await hub.twoFactorLogin(resp.login_2fa_token, pref.twoFactorCode);
      await saveToken(twoFactorLoginResp.token);
      return hub;
    }

    showToast({
      style: Toast.Style.Failure,
      title: "Failed to login",
      message: `Token not found in the response: ${resp}`,
    });
  } catch (err) {
    showToast(Toast.Style.Failure, "Failed to login", `${err}`);
  }
};

export default function SearchRepository() {
  const [result, setResult] = useState<ListReposResponse>();
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");
  const [hubState, setHub] = useState<Hub>();

  const search = useCallback(
    (text: string) => {
      const abortCtrl = new AbortController();
      const fn = async () => {
        setLoading(true);
        try {
          const hub = await initHub();
          if (!hub) {
            return;
          }
          setHub(hub);
          let user: UserInfo;
          try {
            user = await hub.getUserInfo(abortCtrl.signal);
          } catch (err) {
            showToast(Toast.Style.Failure, "Failed to get user info", (err as Error).message);
            return;
          }

          const resp = await hub.listRepos({ account: user.username, signal: abortCtrl.signal, searchName: text });
          setResult(resp);
          setSearchText(searchText);
        } catch (err) {
          showToast({
            style: Toast.Style.Failure,
            title: "Search failed",
            message: (err as Error).message,
          });
          console.log(err);
        } finally {
          setLoading(false);
        }
      };
      fn();
      return () => abortCtrl.abort();
    },
    [setResult, setLoading],
  );

  useEffect(() => {
    search("");
  }, []);

  return (
    <List isLoading={loading} onSearchTextChange={search} throttle>
      {result?.results.map((item) => (
        <List.Item
          key={item.path}
          icon={item.is_private ? Icon.Lock : Icon.LockUnlocked}
          title={`${item.namespace} / ${item.name}`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} />
              <Action.Push icon={Icon.List} title="Show Tags" target={<SearchTags repo={item.path} hub={hubState} />} />
              <Action.CopyToClipboard title="Copy URL" content={item.url} />
              <Action.SubmitForm
                icon={Icon.ArrowClockwise}
                title="Refresh"
                onSubmit={() => {
                  search(searchText);
                }}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
          accessories={[
            {
              text: `${item.star_count}`,
              icon: Icon.Star,
              tooltip: `${item.star_count} Stars`,
            },
            {
              text: `${item.pull_count}`,
              icon: Icon.Download,
              tooltip: `${item.pull_count} Downloads`,
            },
          ]}
        />
      ))}
    </List>
  );
}
