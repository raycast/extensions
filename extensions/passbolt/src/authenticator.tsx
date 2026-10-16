import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  Clipboard,
  getPreferenceValues,
  LaunchProps,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { PassboltClient } from "./lib/passbolt";
import { getActiveWebsiteUrl } from "./lib/active-website";
import { TotpLoadProgress, TotpResource } from "./types";
import {
  createTotpGenerator,
  filterTotpResources,
  rankTotpResources,
  websiteHostname,
  websiteMatchScore,
} from "./utils/totp";
import type { TOTP } from "otpauth";

export default function Authenticator(props: LaunchProps<{ launchContext?: { url?: string } }>) {
  const [items, setItems] = useState<TotpResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [progress, setProgress] = useState<TotpLoadProgress>();
  const [searchText, setSearchText] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [client] = useState(() => new PassboltClient());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const { matchCurrentWebsite = true } = getPreferenceValues<Preferences.Authenticator>();

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (matchCurrentWebsite) {
      getActiveWebsiteUrl(props.launchContext?.url).then((url) => {
        if (!cancelled) setWebsiteUrl(url);
      });
    } else {
      setWebsiteUrl(undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [matchCurrentWebsite, props.launchContext?.url]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(undefined);
    setProgress(undefined);
    setItems([]);
    client
      .getTotpResources({
        signal: controller.signal,
        onProgress: (update) => {
          if (!controller.signal.aborted) {
            setProgress(update);
            setItems(update.items);
          }
        },
      })
      .then(async (result) => {
        if (controller.signal.aborted) return;
        const failures = result.items.filter((item) => item.totp_error || item.metadata_error);
        if (failures.length) {
          await showToast({
            style: Toast.Style.Failure,
            title: `${failures.length} authenticator entries need attention`,
            message: failures[0].totp_error || failures[0].metadata_error,
          });
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setLoadError(String(error));
        showToast({ style: Toast.Style.Failure, title: "Failed to load authenticator", message: String(error) });
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [client, revision]);

  const generators = useMemo(
    () => new Map(items.map((item) => [item.id, item.totp ? createTotpGenerator(item.totp) : undefined])),
    [items],
  );
  const filtered = useMemo(
    () => rankTotpResources(filterTotpResources(items, searchText), websiteUrl),
    [items, searchText, websiteUrl],
  );
  const matching = useMemo(
    () => filtered.filter((item) => websiteMatchScore(item, websiteUrl) > 0),
    [filtered, websiteUrl],
  );
  const others = useMemo(
    () => filtered.filter((item) => websiteMatchScore(item, websiteUrl) === 0),
    [filtered, websiteUrl],
  );
  const refresh = () => setRevision((value) => value + 1);
  const refreshAction = (
    <Action
      title="Refresh Accounts"
      onAction={refresh}
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
  const renderItem = (item: TotpResource) => (
    <TotpListItem
      key={item.id}
      item={item}
      generator={generators.get(item.id)}
      timestamp={currentTime}
      onRefresh={refresh}
    />
  );

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search accounts, usernames, websites, or tags…"
      actions={<ActionPanel>{refreshAction}</ActionPanel>}
    >
      {filtered.length === 0 && (
        <List.EmptyView
          title={
            isLoading
              ? "Loading Authenticator"
              : loadError
                ? "Could Not Load Authenticator"
                : searchText
                  ? "No Matching TOTP Accounts"
                  : "No TOTP Accounts Found"
          }
          description={
            isLoading
              ? progress
                ? `Loading ${progress.processed}/${progress.candidates} TOTP-capable entries (${progress.totalResources} vault items)`
                : "Loading vault and identifying TOTP accounts…"
              : loadError ||
                (searchText
                  ? "Try a name, username, URL, tag, or OCI for Oracle"
                  : "No TOTP configurations were found in the available resources")
          }
          icon={loadError ? Icon.ExclamationMark : Icon.Key}
        />
      )}
      {matching.length > 0 && (
        <List.Section
          title={`Current Website · ${websiteHostname(websiteUrl)}`}
          subtitle={`${matching.length} accounts`}
        >
          {matching.map(renderItem)}
        </List.Section>
      )}
      {others.length > 0 && (
        <List.Section
          title={matching.length ? "Other Accounts" : "TOTP Accounts"}
          subtitle={
            isLoading && progress
              ? `${items.length} loaded · ${progress.processed}/${progress.candidates}`
              : `${others.length} accounts`
          }
        >
          {others.map(renderItem)}
        </List.Section>
      )}
    </List>
  );
}

function TotpListItem({
  item,
  generator,
  timestamp,
  onRefresh,
}: {
  item: TotpResource;
  generator?: TOTP;
  timestamp: number;
  onRefresh: () => void;
}) {
  const code = generator?.generate({ timestamp });
  const remaining = generator ? Math.ceil(generator.remaining({ timestamp }) / 1000) : 0;
  const error = item.totp_error || item.metadata_error;
  const accessories: List.Item.Accessory[] = [];
  if (error) accessories.push({ icon: { source: Icon.ExclamationMark, tintColor: Color.Orange }, tooltip: error });
  if (item.uri) accessories.push({ text: websiteHostname(item.uri) || item.uri });
  accessories.push({ text: code || "Code unavailable", icon: Icon.Key });
  if (generator)
    accessories.push({
      tag: { value: `${remaining}s`, color: remaining <= 5 ? Color.Red : remaining <= 10 ? Color.Orange : Color.Green },
    });

  async function copyCode(paste: boolean) {
    if (!generator) return;
    try {
      // Generate at action time so copying at a rollover never uses the previous displayed code.
      const currentCode = generator.generate();
      if (paste) await Clipboard.paste(currentCode);
      else await Clipboard.copy(currentCode, { concealed: true });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Could not copy TOTP code" });
    }
  }

  return (
    <List.Item
      title={item.name || "Unnamed resource"}
      subtitle={item.username}
      icon={item.favorite ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Key}
      accessories={accessories}
      actions={
        <ActionPanel>
          {generator && (
            <>
              <Action
                title="Copy TOTP Code"
                icon={Icon.Key}
                onAction={() => copyCode(false)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Paste TOTP Code"
                icon={Icon.Key}
                onAction={() => copyCode(true)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              />
            </>
          )}
          {item.username && <Action.CopyToClipboard title="Copy Username" content={item.username} icon={Icon.Person} />}
          {item.uri && <Action.OpenInBrowser title="Open Website" url={item.uri} icon={Icon.Globe} />}
          <Action
            title="Refresh Accounts"
            onAction={onRefresh}
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
