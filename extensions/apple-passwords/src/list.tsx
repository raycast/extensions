import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  LaunchProps,
  List,
  showHUD,
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
        PREFERENCES.copySecrets
          ? Clipboard.copy(value)
          : Clipboard.paste(value);
        showHUD(hudText);
      } else {
        showHUD("No value found");
      }
      onAction?.();
    } catch (error) {
      console.error("Error retrieving secret: ", error);
      showHUD("Error retrieving secret");
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
  if (entry.password) {
    accessories.push({ tag: { value: "Password", color: Color.Blue } });
    actions.push(renderAction("pw", entry.domain, entry.username));
  }
  if (entry.code) {
    accessories.push({ tag: { value: "OTP", color: Color.Green } });
    actions.push(renderAction("otp", entry.domain, entry.username));
  }
  return (
    <List.Item
      key={`${entry.username}-${entry.domain}`}
      title={entry.username}
      subtitle={entry.domain}
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
    if (parsed.error) {
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
      const url = await getActiveURL();
      if (!url) {
        setLoading(false);
        return;
      }
      setUrl(url);
      setSearchTxt(url);
    };
    const getData = async () => {
      if (!url) {
        return;
      }
      const data = await listAPWEntries(url);
      setData(data);
      setLoading(false);
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
