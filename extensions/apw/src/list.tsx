import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  LaunchProps,
  LaunchType,
  List,
  launchCommand,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import psl from "psl";
import {
  APWEntry,
  getActiveURL,
  getAPWEntries,
  listAPWEntries,
  PREFERENCES,
} from "./utils";

const renderAction = (
  action: "pw" | "otp" | "usr",
  domain: string,
  username: string,
  onAction?: () => void,
) => {
  const fullAction =
    action === "pw" ? "Password" : action === "usr" ? "Username" : "OTP";
  const hudText = PREFERENCES.copySecrets
    ? `${fullAction} copied to clipboard`
    : `${fullAction} inserted at cursor`;
  const copyToClipboard = async () => {
    try {
      let secretEntry;
      if (action !== "usr") {
        secretEntry = (await getAPWEntries(domain, action)).find(
          (entry: APWEntry) =>
            entry.username === username && entry.domain === domain,
        );
      }
      const value =
        action === "pw"
          ? secretEntry?.password
          : action === "usr"
            ? username
            : secretEntry?.code;
      if (value) {
        if (PREFERENCES.copySecrets) {
          await Clipboard.copy(value);
        } else {
          await Clipboard.paste(value);
        }
        showHUD(hudText);
      } else {
        showToast({ style: Toast.Style.Failure, title: "No value found" });
      }
      onAction?.();
    } catch (error) {
      console.error("Error retrieving secret: ", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error retrieving secret",
        message: error instanceof Error ? error.message : undefined,
      });
    }
  };
  return (
    <Action
      title={`Copy ${fullAction}`}
      onAction={copyToClipboard}
      shortcut={
        action == "otp"
          ? { modifiers: ["cmd", "shift"], key: "return" }
          : undefined
      }
    />
  );
};

const renderItem = (entry: APWEntry) => {
  const accessories = [];
  const actions = [];
  actions.push(renderAction("usr", entry.domain, entry.username));
  // Every login entry has a password; the real value is fetched on demand via
  // `pw get`, so always offer the action rather than relying on the list payload.
  accessories.push({ tag: { value: "Password", color: Color.Blue } });
  actions.push(renderAction("pw", entry.domain, entry.username));
  if (entry.hasOtp) {
    accessories.push({ tag: { value: "OTP", color: Color.Green } });
    actions.push(renderAction("otp", entry.domain, entry.username));
  }
  // When a custom title exists show it as the primary label; move the username
  // into the subtitle alongside the domain so it's still visible.
  const title = entry.title ?? entry.username;
  const subtitle = entry.title
    ? `${entry.username} · ${entry.domain}`
    : entry.domain;
  return (
    <List.Item
      key={`${entry.username}-${entry.domain}`}
      title={title}
      subtitle={subtitle}
      icon={Icon.PersonCircle}
      actions={<ActionPanel children={actions} />}
      accessories={accessories}
    />
  );
};

let debounceTimer: NodeJS.Timeout;

export default function Command(
  props: LaunchProps<{ arguments: Arguments.List }>,
) {
  const [url, setUrl] = useState<string>(props.arguments.url || "");
  const [searchTxt, setSearchTxt] = useState<string>("");
  const [data, setData] = useState<APWEntry[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const handleSearchTextChange = (text: string) => {
    const parsed = psl.parse(text);
    if ("error" in parsed) {
      // if the text is not a valid URL
      setData([]);
      return;
    }
    if (!parsed.tld) {
      setData([]);
      return;
    }
    if (parsed.domain) {
      setUrl(parsed.domain);
    }
  };

  const handleDebouncedSearchTextChange = (text: string) => {
    setSearchTxt(text);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      handleSearchTextChange(text);
    }, 300);
  };

  useEffect(() => {
    const getUrl = async () => {
      try {
        const url = await getActiveURL();
        if (!url) {
          setLoading(false);
          return;
        }
        setUrl(url);
        setSearchTxt(url);
      } catch {
        setLoading(false);
      }
    };
    const getData = async () => {
      if (!url) {
        return;
      }
      try {
        const data = await listAPWEntries(url);
        setData(data);
      } catch (error) {
        if ((error as { apwStatus?: number }).apwStatus === 9) {
          await launchCommand({ name: "auth", type: LaunchType.UserInitiated });
          return;
        }
        showToast({
          style: Toast.Style.Failure,
          title: "APW Error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    };
    if (!url) {
      getUrl();
    }
    getData();
  }, [url]);
  if (isLoading) {
    return (
      <List
        filtering={false}
        searchText=""
        isLoading
        searchBarPlaceholder="Loading"
      />
    );
  }
  return (
    <List
      searchText={searchTxt}
      onSearchTextChange={handleDebouncedSearchTextChange}
      filtering={false}
    >
      {data.map((i) => renderItem(i))}
    </List>
  );
}
