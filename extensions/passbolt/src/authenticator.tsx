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
  Keyboard,
} from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";
import { getPassboltClient } from "./lib/passbolt";
import { getActiveWebsites } from "./lib/active-website";
import { TotpLoadProgress, TotpResource } from "./types";
import { createTotpGenerator, filterTotpResources, rankAndPartitionTotpResources, websiteHostname } from "./utils/totp";
import { chooseActiveWebsite, type ActiveWebsite } from "./utils/website";
import type { TOTP } from "otpauth";

export default function Authenticator(props: LaunchProps<{ launchContext?: { url?: string } }>) {
  const [items, setItems] = useState<TotpResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [progress, setProgress] = useState<TotpLoadProgress>();
  const [searchText, setSearchText] = useState("");
  const [activeWebsites, setActiveWebsites] = useState<ActiveWebsite[]>([]);
  const [revision, setRevision] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const selection = useRef<{ revision: number; autoSelect: boolean }>({ revision: 0, autoSelect: true });
  const [client] = useState(() => getPassboltClient());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const { matchCurrentWebsite = true } = getPreferenceValues<Preferences.Authenticator>();

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setActiveWebsites([]);
    if (matchCurrentWebsite) {
      getActiveWebsites(props.launchContext?.url).then((websites) => {
        if (!cancelled) setActiveWebsites(websites);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [matchCurrentWebsite, props.launchContext?.url]);

  // The best website can change while entries stream in: a partial vault can favor a
  // title-only match for one window over an exact match for another. Re-evaluate on
  // every update so the choice settles on the complete vault instead of freezing the
  // first guess; the row selection pin below keeps the selection stable meanwhile.
  const activeWebsite = useMemo(
    () => chooseActiveWebsite(items, activeWebsites, (resource) => [resource.totp?.issuer, resource.totp?.label]),
    [items, activeWebsites],
  );

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
  // Rank and split in one pass: each entry is scored against the current website exactly once.
  const { matching, others } = useMemo(
    () =>
      rankAndPartitionTotpResources(filterTotpResources(items, searchText), activeWebsite?.url, activeWebsite?.title),
    [items, searchText, activeWebsite],
  );
  useEffect(() => {
    if (selection.current.revision !== revision || !selection.current.autoSelect || searchText || !matching.length)
      return;
    selection.current.autoSelect = false;
    setSelectedItemId(matching[0].id);
  }, [matching, searchText, revision]);

  const onSelectionChange = (id: string | null) => {
    // Ignore empty-list notifications and callbacks from the list being refreshed.
    if (selection.current.revision !== revision || id === null) return;
    const firstId = matching[0]?.id ?? others[0]?.id;
    // Raycast reports its own default selection when the list grows or reorders. Only a
    // deliberate move away from the first result should cancel the pending website jump.
    if (id !== firstId) selection.current.autoSelect = false;
    setSelectedItemId(id);
  };
  const onSearchTextChange = (text: string) => {
    if (text) selection.current.autoSelect = false;
    setSearchText(text);
    // Let Raycast choose a visible result when filtering hides the selected entry.
    setSelectedItemId(undefined);
  };
  const refresh = () => {
    const nextRevision = selection.current.revision + 1;
    selection.current = { revision: nextRevision, autoSelect: !searchText };
    setSelectedItemId(undefined);
    // Clear in the same update as revision so the selection effect cannot pin old items.
    setItems([]);
    setRevision(nextRevision);
  };
  const refreshAction = (
    <Action
      title="Refresh Accounts"
      onAction={refresh}
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
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
      onSearchTextChange={onSearchTextChange}
      selectedItemId={selectedItemId}
      onSelectionChange={onSelectionChange}
      searchBarPlaceholder="Search accounts, usernames, websites, or tags…"
      actions={<ActionPanel>{refreshAction}</ActionPanel>}
    >
      {matching.length === 0 && others.length === 0 && (
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
          key="current-website"
          title={`Current Website · ${websiteHostname(activeWebsite?.url)}`}
          subtitle={`${matching.length} accounts`}
        >
          {matching.map(renderItem)}
        </List.Section>
      )}
      {others.length > 0 && (
        <List.Section
          key="other-accounts"
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
      id={item.id}
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
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              {/* As the secondary action this gets ⌘↵ (Ctrl↵ on Windows) from Raycast,
                  which the action bar shows next to the primary action. */}
              <Action title="Paste TOTP Code" icon={Icon.Key} onAction={() => copyCode(true)} />
            </>
          )}
          {item.username && <Action.CopyToClipboard title="Copy Username" content={item.username} icon={Icon.Person} />}
          {item.uri && <Action.OpenInBrowser title="Open Website" url={item.uri} icon={Icon.Globe} />}
          <Action
            title="Refresh Accounts"
            onAction={onRefresh}
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    />
  );
}
