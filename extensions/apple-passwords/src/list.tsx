import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  getFrontmostApplication,
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
import { APWEntry, getActiveURL, getAPWEntry, listAPWEntries, PREFERENCES } from "./utils";

const renderAction = (
  action: "pw" | "otp" | "usr",
  domain: string,
  username: string,
  pasteTarget?: string,
  onAction?: () => void,
) => {
  const fullAction = action === "pw" ? "Password" : action === "usr" ? "Username" : "OTP";
  const verb = PREFERENCES.copySecrets ? "Copy" : "Paste";
  const title = PREFERENCES.copySecrets
    ? `Copy ${fullAction}`
    : pasteTarget
      ? `Paste ${fullAction} to ${pasteTarget}`
      : `Paste ${fullAction}`;
  const hudText = PREFERENCES.copySecrets
    ? `${fullAction} copied to clipboard`
    : pasteTarget
      ? `${fullAction} pasted to ${pasteTarget}`
      : `${fullAction} inserted at cursor`;
  const copyToClipboard = async () => {
    try {
      let secretEntry;
      if (action !== "usr") {
        secretEntry = await getAPWEntry(domain, action, username);
      }
      const value = action === "pw" ? secretEntry?.password : action === "usr" ? username : secretEntry?.code;
      if (value) {
        if (PREFERENCES.copySecrets) {
          await Clipboard.copy(value, { concealed: true });
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
        title: `Failed to ${verb.toLowerCase()} ${fullAction.toLowerCase()}`,
        message: error instanceof Error ? error.message : undefined,
      });
    }
  };
  return (
    <Action
      key={action}
      title={title}
      onAction={copyToClipboard}
      shortcut={action == "otp" ? { modifiers: ["cmd", "shift"], key: "return" } : undefined}
    />
  );
};

const renderItem = (entry: APWEntry, pasteTarget?: string) => {
  const accessories = [];
  const actions = [];
  actions.push(renderAction("usr", entry.domain, entry.username, pasteTarget));
  actions.push(renderAction("pw", entry.domain, entry.username, pasteTarget));
  if (entry.hasOtp) {
    accessories.push({ tag: { value: "OTP", color: Color.Green } });
    actions.push(renderAction("otp", entry.domain, entry.username, pasteTarget));
  }
  accessories.push({ icon: { source: Icon.Key, tintColor: Color.Blue } });
  const title = entry.title ?? entry.username;
  const subtitle = entry.title ? `${entry.username} · ${entry.domain}` : entry.domain;
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

export default function Command(props: LaunchProps<{ arguments: Arguments.List }>) {
  const [url, setUrl] = useState<string>(props.arguments.url || "");
  const [searchTxt, setSearchTxt] = useState<string>(props.arguments.url || "");
  const [data, setData] = useState<APWEntry[]>([]);
  const [pasteTarget, setPasteTarget] = useState<string | undefined>();

  useEffect(() => {
    if (PREFERENCES.copySecrets) return;
    getFrontmostApplication()
      .then((app) => setPasteTarget(app.name))
      .catch(() => {});
  }, []);

  const handleSearchTextChange = (text: string) => {
    const parsed = psl.parse(text);
    if ("error" in parsed || !parsed.tld) return;
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
    let active = true;

    const loadData = async () => {
      const targetUrl = url || (await getActiveURL());
      if (!active || !targetUrl) return;
      if (!url) setSearchTxt(targetUrl);

      try {
        const data = await listAPWEntries(targetUrl);
        if (active) setData(data);
      } catch (error) {
        if (!active) return;
        if ((error as { apwStatus?: number }).apwStatus === 9) {
          await launchCommand({ name: "auth", type: LaunchType.UserInitiated, context: { returnUrl: targetUrl } });
          return;
        }
        showToast({
          style: Toast.Style.Failure,
          title: "APW Error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [url]);
  return (
    <List searchText={searchTxt} onSearchTextChange={handleDebouncedSearchTextChange} filtering={false}>
      {data.map((i) => renderItem(i, pasteTarget))}
    </List>
  );
}
