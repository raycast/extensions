import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  Image,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { getFavicon, useCachedState, useFrecencySorting, usePromise } from "@raycast/utils";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getItem, getTotp } from "./pass-cli";
import { Item, ItemDetail } from "./types";
import {
  formatRelativeTime,
  formatTypeLabel,
  hostnameOf,
  itemKey,
  noteToMarkdown,
  toOpenableUrl,
  websiteLabels,
} from "./format";
import { generateTotp, getTotpPeriod, parseOtpauthUri } from "./totp";
import { getInitialIconDataUri } from "./avatar";
import { canFillFrontmostApp, fillFrontmostApp } from "./autofill";
import { formatTotpCode, getItemIcon } from "./utils";
import { platformShortcut } from "./shortcuts";

const DETAIL_DEBOUNCE_MS = 150;
const MASKED_SECRET = "••••••••••••";

type LabelText = string | { value: string; color?: Color };
const EMPTY_VALUE: LabelText = { value: "—", color: Color.SecondaryText };
const LOADING_VALUE: LabelText = { value: "Loading…", color: Color.SecondaryText };
const UNAVAILABLE_VALUE: LabelText = { value: "Unavailable", color: Color.SecondaryText };

function detailKey(item: Item): string {
  return `${itemKey(item)}:${item.modifiedAt ?? ""}`;
}

/**
 * Item details include secrets, so they are only loaded on demand and kept in memory for as long as
 * the command is open. They are never written to the LocalStorage cache.
 */
class ItemDetailStore {
  private readonly pending = new Map<string, Promise<ItemDetail>>();
  private readonly loaded = new Map<string, ItemDetail>();

  peek(item: Item): ItemDetail | undefined {
    return this.loaded.get(detailKey(item));
  }

  load(item: Item): Promise<ItemDetail> {
    const key = detailKey(item);
    let pending = this.pending.get(key);
    if (!pending) {
      pending = getItem(item.shareId, item.itemId, item.vaultName);
      this.pending.set(key, pending);
      pending.then(
        (detail) => this.loaded.set(key, detail),
        () => this.pending.delete(key),
      );
    }
    return pending;
  }
}

function useItemDetail(store: ItemDetailStore, item: Item | undefined) {
  const key = item ? detailKey(item) : undefined;
  const itemRef = useRef(item);
  itemRef.current = item;
  const [state, setState] = useState<{ key: string; detail?: ItemDetail; error?: string }>();

  useEffect(() => {
    const current = itemRef.current;
    if (!key || !current || store.peek(current)) return;

    let cancelled = false;
    // Debounced so that scrolling through the list doesn't start a pass-cli process for every row.
    const timer = setTimeout(() => {
      store.load(current).then(
        (detail) => {
          if (!cancelled) setState({ key, detail });
        },
        (error: unknown) => {
          if (!cancelled) setState({ key, error: error instanceof Error ? error.message : String(error) });
        },
      );
    }, DETAIL_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, store]);

  const cached = item ? store.peek(item) : undefined;
  const current = state?.key === key ? state : undefined;
  return {
    detail: cached ?? current?.detail,
    error: current?.error,
    isLoading: key !== undefined && !cached && !current,
  };
}

/** A 2FA code, with the seconds it stays valid when its period is known. */
interface DisplayedCode {
  code: string;
  remainingSeconds?: number;
}

/** Live TOTP code for the item shown in the detail panel, generated locally from its otpauth URI when possible. */
function useTotpCode(item: Item, detail: ItemDetail | undefined): DisplayedCode | undefined {
  const params = useMemo(() => (detail?.totpUri ? parseOtpauthUri(detail.totpUri) : undefined), [detail?.totpUri]);
  const isEnabled = item.hasTotp && detail !== undefined;
  const [now, setNow] = useState(() => Date.now());
  const [cliCode, setCliCode] = useState<{ step: number; code: string }>();

  useEffect(() => {
    if (!isEnabled) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isEnabled]);

  // Codes that can't be generated locally come from pass-cli: refreshed every period when the URI is
  // time-based, fetched once otherwise (counter-based codes have no lifetime to count down).
  const period = params?.period ?? (detail?.totpUri ? getTotpPeriod(detail.totpUri) : undefined);
  const step = period ? Math.floor(now / 1000 / period) : 0;

  useEffect(() => {
    if (!isEnabled || params) return;
    let cancelled = false;
    getTotp(item.shareId, item.itemId).then(
      (code) => {
        if (!cancelled) setCliCode({ step, code });
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [isEnabled, params, step, item.shareId, item.itemId]);

  if (!isEnabled) return undefined;
  if (params) return generateTotp(params, now);
  if (cliCode?.step !== step) return undefined;
  return period
    ? { code: cliCode.code, remainingSeconds: period - (Math.floor(now / 1000) % period) }
    : { code: cliCode.code };
}

interface ItemDetailPanelProps {
  item: Item;
  detail?: ItemDetail;
  isLoading: boolean;
  error?: string;
}

/**
 * Every item shows the same rows in the same order, with "—" for empty values, so fields stay in place
 * while browsing. Custom fields, which only some items have, come last.
 */
const ItemDetailPanel = memo(function ItemDetailPanel({ item, detail, isLoading, error }: ItemDetailPanelProps) {
  const totp = useTotpCode(item, detail);
  const urls = detail?.urls ?? item.urls ?? [];
  const websiteNames = websiteLabels(urls);
  const customFields = detail?.customFields ?? [];
  const hasPassword = detail ? detail.password !== undefined : item.hasPassword;
  const modified = item.modifiedAt ? formatRelativeTime(item.modifiedAt) : undefined;
  // Value for fields that are only known once the item's details are loaded.
  const notLoadedValue: LabelText = error ? UNAVAILABLE_VALUE : isLoading ? LOADING_VALUE : EMPTY_VALUE;

  let password: LabelText = EMPTY_VALUE;
  if (hasPassword) password = MASKED_SECRET;
  else if (hasPassword === undefined && item.type === "login") password = notLoadedValue;

  let totpCode: LabelText = EMPTY_VALUE;
  if (totp) {
    totpCode =
      totp.remainingSeconds === undefined
        ? formatTotpCode(totp.code)
        : {
            value: `${formatTotpCode(totp.code)}  ·  ${totp.remainingSeconds}s`,
            color: totp.remainingSeconds <= 5 ? Color.Orange : undefined,
          };
  } else if (item.hasTotp) {
    totpCode = error ? UNAVAILABLE_VALUE : LOADING_VALUE;
  }

  // Notes are masked like passwords; Show Note opens the full note.
  const hasNote = detail ? detail.note !== undefined : item.hasNote;
  let note: LabelText = EMPTY_VALUE;
  if (hasNote) note = MASKED_SECRET;
  else if (hasNote === undefined) note = notLoadedValue;

  return (
    <List.Item.Detail
      isLoading={isLoading}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Username"
            text={detail?.username ?? item.username ?? EMPTY_VALUE}
            icon={Icon.Person}
          />
          <List.Item.Detail.Metadata.Label
            title="Email"
            text={detail?.email ?? item.email ?? EMPTY_VALUE}
            icon={Icon.Envelope}
          />
          <List.Item.Detail.Metadata.Label title="Password" text={password} icon={Icon.Key} />
          <List.Item.Detail.Metadata.Label title="2FA Code" text={totpCode} icon={Icon.Clock} />
          {urls.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Website">
              {urls.map((url, index) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={`${url}-${index}`}
                  text={websiteNames[index]}
                  onAction={() => open(toOpenableUrl(url))}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <List.Item.Detail.Metadata.Label title="Website" text={EMPTY_VALUE} />
          )}
          <List.Item.Detail.Metadata.Label title="Note" text={note} icon={Icon.Document} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Vault" text={item.vaultName} icon={Icon.Folder} />
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={formatTypeLabel(item.type)}
            icon={getItemIcon(item.type)}
          />
          <List.Item.Detail.Metadata.Label title="Last Modified" text={modified ?? EMPTY_VALUE} icon={Icon.Calendar} />
          {customFields.length > 0 && <List.Item.Detail.Metadata.Separator />}
          {customFields.map((field, index) => (
            <List.Item.Detail.Metadata.Label
              key={`${field.name}-${index}`}
              title={field.name}
              text={field.type === "hidden" ? MASKED_SECRET : field.value || EMPTY_VALUE}
            />
          ))}
          {error && (
            <List.Item.Detail.Metadata.Label
              title="Error"
              text={{ value: `Couldn't load details: ${error.split("\n")[0]}`, color: Color.Red }}
              icon={Icon.ExclamationMark}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
});

/** Full note in its own view, with the original formatting. */
function NoteView({ item, store }: { item: Item; store: ItemDetailStore }) {
  const { data: detail, isLoading, error } = usePromise((current: Item) => store.load(current), [item]);
  const note = detail?.note;

  let markdown = "";
  if (error) markdown = "Couldn't load this note.";
  else if (note) markdown = noteToMarkdown(note);
  else if (!isLoading) markdown = "_This item has no note._";

  return (
    <Detail
      navigationTitle={item.title}
      isLoading={isLoading}
      markdown={markdown}
      actions={
        note ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Note" content={note} concealed={true} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

interface ItemActionsProps {
  item: Item;
  detail?: ItemDetail;
  store: ItemDetailStore;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  onRefresh?: () => void;
  onUse: (item: Item) => void;
}

const ItemActions = memo(function ItemActions({
  item,
  detail,
  store,
  isShowingDetail,
  onToggleDetail,
  onRefresh,
  onUse,
}: ItemActionsProps) {
  const preferences = getPreferenceValues<Preferences>();
  // Keeps secrets out of Raycast's clipboard history.
  const concealSecrets = preferences.copyPasswordTransient ?? true;
  const hasPassword = item.type === "login" && item.hasPassword !== false;
  const canFill = canFillFrontmostApp && hasPassword;
  const fillFirst = canFill && preferences.primaryAction === "fill";
  const urls = detail?.urls ?? item.urls ?? [];
  const websiteNames = websiteLabels(urls);

  async function loadDetail(): Promise<ItemDetail> {
    const loaded = store.peek(item);
    if (loaded) return loaded;
    await showToast({ style: Toast.Style.Animated, title: "Loading Item…" });
    return store.load(item);
  }

  async function copy(label: string, getValue: () => Promise<string | undefined>, isSecret: boolean) {
    try {
      const value = await getValue();
      if (!value) {
        await showToast({ style: Toast.Style.Failure, title: `No ${label} Saved for This Item` });
        return;
      }
      await Clipboard.copy(value, { concealed: isSecret && concealSecrets });
      onUse(item);
      await showToast({ style: Toast.Style.Success, title: `${label} Copied` });
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to Copy ${label}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function getTotpCode(): Promise<string> {
    const totpUri = store.peek(item)?.totpUri;
    const params = totpUri ? parseOtpauthUri(totpUri) : undefined;
    return params ? generateTotp(params).code : getTotp(item.shareId, item.itemId);
  }

  /** Pastes into the app that was in front of Raycast; the 2FA code is then left in the clipboard. */
  async function fill(fields: "login" | "email" | "username" | "password") {
    try {
      const loaded = await loadDetail();
      // Most logins use the email, so it comes first; the username is used when there's no email.
      const identifier = loaded.email ?? loaded.username;
      const values = {
        login: [identifier, loaded.password],
        email: [loaded.email],
        username: [loaded.username],
        password: [loaded.password],
      }[fields];
      if (!values.every((value): value is string => Boolean(value))) {
        const missing =
          fields === "login"
            ? identifier
              ? "Password"
              : "Email or Username"
            : { email: "Email", username: "Username", password: "Password" }[fields];
        await showToast({ style: Toast.Style.Failure, title: `No ${missing} Saved for This Item` });
        return;
      }
      onUse(item);
      await fillFrontmostApp({
        values,
        submit: fields === "login" && preferences.submitAfterFill,
        getClipboardValue:
          fields === "login" || fields === "password" ? (item.hasTotp ? getTotpCode : undefined) : undefined,
        clipboardValueHud: "2FA code copied, paste it with ⌘V",
      });
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Fill",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function pasteTotpCode() {
    try {
      const code = await getTotpCode();
      onUse(item);
      await fillFrontmostApp({ values: [code] });
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Paste 2FA Code",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const copyPasswordAction = hasPassword ? (
    <Action
      title="Copy Password"
      icon={Icon.Key}
      shortcut={Keyboard.Shortcut.Common.Copy}
      onAction={() => copy("Password", async () => (await loadDetail()).password, true)}
    />
  ) : null;
  const fillAction = canFill ? <Action title="Fill Login" icon={Icon.Keyboard} onAction={() => fill("login")} /> : null;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {fillFirst ? fillAction : copyPasswordAction}
        {fillFirst ? copyPasswordAction : fillAction}
        {item.type === "note" && (
          <Action.Push
            title="Show Note"
            icon={Icon.Eye}
            shortcut={platformShortcut(["cmd", "shift"], "n")}
            target={<NoteView item={item} store={store} />}
          />
        )}
        {item.type === "note" && (
          <Action
            title="Copy Note"
            icon={Icon.Document}
            shortcut={platformShortcut(["cmd"], "n")}
            onAction={() => copy("Note", async () => (await loadDetail()).note, true)}
          />
        )}
        {item.username && (
          <Action
            title="Copy Username"
            icon={Icon.Person}
            shortcut={platformShortcut(["cmd", "shift"], "c")}
            onAction={() => copy("Username", async () => item.username, false)}
          />
        )}
        {item.email && (
          <Action
            title="Copy Email"
            icon={Icon.Envelope}
            shortcut={platformShortcut(["cmd", "opt"], "c")}
            onAction={() => copy("Email", async () => item.email, false)}
          />
        )}
        {item.hasTotp && (
          <Action
            title="Copy 2FA Code"
            icon={Icon.Clock}
            shortcut={platformShortcut(["cmd"], "t")}
            onAction={() => copy("2FA Code", getTotpCode, true)}
          />
        )}
      </ActionPanel.Section>
      {canFill && (
        <ActionPanel.Section title="Paste">
          {item.email && <Action title="Paste Email" icon={Icon.Envelope} onAction={() => fill("email")} />}
          {item.username && <Action title="Paste Username" icon={Icon.Person} onAction={() => fill("username")} />}
          <Action title="Paste Password" icon={Icon.Key} onAction={() => fill("password")} />
          {item.hasTotp && (
            <Action
              title="Paste 2FA Code"
              icon={Icon.Clock}
              shortcut={platformShortcut(["cmd", "shift"], "t")}
              onAction={pasteTotpCode}
            />
          )}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        {urls[0] && (
          <Action.OpenInBrowser
            title="Open Website"
            url={toOpenableUrl(urls[0])}
            shortcut={Keyboard.Shortcut.Common.Open}
            onOpen={() => onUse(item)}
          />
        )}
        {urls[0] && (
          <Action
            title="Copy Website URL"
            icon={Icon.Link}
            shortcut={platformShortcut(["cmd"], "u")}
            onAction={() => copy("URL", async () => urls[0], false)}
          />
        )}
        {item.type !== "note" && (item.hasNote || detail?.note) && (
          <Action.Push
            title="Show Note"
            icon={Icon.Eye}
            shortcut={platformShortcut(["cmd", "shift"], "n")}
            target={<NoteView item={item} store={store} />}
          />
        )}
        {item.type !== "note" && (item.hasNote || detail?.note) && (
          <Action
            title="Copy Note"
            icon={Icon.Document}
            shortcut={platformShortcut(["cmd"], "n")}
            onAction={() => copy("Note", async () => (await loadDetail()).note, true)}
          />
        )}
      </ActionPanel.Section>
      {detail?.customFields && detail.customFields.length > 0 && (
        <ActionPanel.Section title="Custom Fields">
          {detail.customFields.map((field, index) => (
            <Action
              key={`${field.name}-${index}`}
              title={`Copy ${field.name}`}
              icon={Icon.Clipboard}
              shortcut={
                index < 9
                  ? platformShortcut(
                      ["cmd", "shift"],
                      String(index + 1) as "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9",
                    )
                  : undefined
              }
              onAction={() => copy(field.name, async () => field.value, field.type === "hidden")}
            />
          ))}
        </ActionPanel.Section>
      )}
      {urls.length > 1 && (
        <ActionPanel.Section title="Websites">
          {urls.map((url, index) => (
            <Action.OpenInBrowser
              key={`${url}-${index}`}
              title={`Open ${websiteNames[index]}`}
              url={toOpenableUrl(url)}
            />
          ))}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <Action
          title={isShowingDetail ? "Hide Details" : "Show Details"}
          icon={Icon.AppWindowSidebarRight}
          shortcut={platformShortcut(["cmd"], "d")}
          onAction={onToggleDetail}
        />
        {onRefresh && (
          <Action
            title="Refresh Items"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Debug">
        <Action
          title="Copy Item Debug Info"
          icon={Icon.Bug}
          shortcut={platformShortcut(["cmd", "shift"], "d")}
          onAction={async () => {
            await Clipboard.copy(
              JSON.stringify(
                {
                  type: item.type,
                  hasPassword: item.hasPassword,
                  hasUsername: Boolean(item.username),
                  hasEmail: Boolean(item.email),
                  urlCount: urls.length,
                  hasTotp: item.hasTotp,
                  hasNote: detail ? Boolean(detail.note) : undefined,
                  customFieldsCount: detail ? (detail.customFields?.length ?? 0) : undefined,
                },
                null,
                2,
              ),
            );
            await showToast({ style: Toast.Style.Success, title: "Debug Info Copied" });
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
});

function getListIcon(item: Item, showWebsiteIcons: boolean): Image.ImageLike {
  if (item.type !== "login") return getItemIcon(item.type);
  const initials = getInitialIconDataUri(item.title);
  const url = item.urls?.[0];
  // Website icons come from the favicon provider set in Raycast, which receives the domain, so they're opt-in.
  return showWebsiteIcons && url
    ? getFavicon(toOpenableUrl(url), { fallback: initials, mask: Image.Mask.RoundedRectangle })
    : { source: initials, fallback: getItemIcon(item.type) };
}

function getKeywords(item: Item): string[] {
  return [item.username, item.email, ...(item.urls ?? []).map(hostnameOf)].filter((value): value is string =>
    Boolean(value),
  );
}

export interface ItemListProps {
  items: Item[];
  /** Shown first, in their own section, e.g. logins matching the active browser tab. */
  suggestedItems?: Item[];
  suggestionsTitle?: string;
  isLoading: boolean;
  navigationTitle?: string;
  searchBarAccessory?: List.Props["searchBarAccessory"];
  emptyView: { icon: Image.ImageLike; title: string; description: string };
  onRefresh?: () => void;
}

export function ItemList({
  items,
  suggestedItems = [],
  suggestionsTitle = "Suggested",
  isLoading,
  navigationTitle,
  searchBarAccessory,
  emptyView,
  onRefresh,
}: ItemListProps) {
  const showWebsiteIcons = getPreferenceValues<Preferences>().showWebsiteIcons ?? false;
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-item-details", true);
  // A new store whenever the list is refreshed, so loaded details are never older than the items.
  const store = useMemo(() => new ItemDetailStore(), [items]);
  const { data: sortedItems, visitItem } = useFrecencySorting(items, { key: itemKey, namespace: "items" });
  const [selectedKey, setSelectedKey] = useState<string>();

  const suggestedKeys = useMemo(() => new Set(suggestedItems.map(itemKey)), [suggestedItems]);
  const suggested = sortedItems.filter((item) => suggestedKeys.has(itemKey(item)));
  const others = suggested.length > 0 ? sortedItems.filter((item) => !suggestedKeys.has(itemKey(item))) : sortedItems;
  // Until Raycast reports a selection, the first item shown is the selected one.
  const firstItem = suggested[0] ?? others[0];
  const activeKey = selectedKey ?? (firstItem ? itemKey(firstItem) : undefined);
  const selectedItem = useMemo(() => items.find((item) => itemKey(item) === activeKey), [items, activeKey]);
  const {
    detail,
    error,
    isLoading: isLoadingDetail,
  } = useItemDetail(store, isShowingDetail ? selectedItem : undefined);

  const icons = useMemo(
    () => new Map(items.map((item) => [itemKey(item), getListIcon(item, showWebsiteIcons)])),
    [items, showWebsiteIcons],
  );
  const toggleDetail = useCallback(() => setIsShowingDetail((value) => !value), [setIsShowingDetail]);
  const onUse = useCallback((item: Item) => void visitItem(item), [visitItem]);

  function renderItem(item: Item) {
    const key = itemKey(item);
    const isSelected = key === activeKey;
    return (
      <List.Item
        key={key}
        id={key}
        icon={icons.get(key)}
        title={item.title}
        subtitle={isShowingDetail ? undefined : (item.username ?? item.email)}
        keywords={getKeywords(item)}
        accessories={[
          ...(item.hasNote ? [{ icon: Icon.Document, tooltip: "Has a note" }] : []),
          ...(item.hasTotp ? [{ icon: Icon.Clock, tooltip: "Has a 2FA code" }] : []),
          ...(isShowingDetail ? [] : [{ text: item.vaultName }]),
        ]}
        detail={
          <ItemDetailPanel
            item={item}
            detail={isSelected ? detail : undefined}
            isLoading={isSelected && isLoadingDetail}
            error={isSelected ? error : undefined}
          />
        }
        actions={
          <ItemActions
            item={item}
            detail={isSelected ? detail : undefined}
            store={store}
            isShowingDetail={isShowingDetail}
            onToggleDetail={toggleDetail}
            onRefresh={onRefresh}
            onUse={onUse}
          />
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && items.length > 0}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search by name, username or website…"
      filtering={true}
      selectedItemId={suggested[0] ? itemKey(suggested[0]) : undefined}
      onSelectionChange={(id) => setSelectedKey(id ?? undefined)}
      searchBarAccessory={searchBarAccessory}
    >
      {items.length === 0 && !isLoading ? (
        <List.EmptyView icon={emptyView.icon} title={emptyView.title} description={emptyView.description} />
      ) : suggested.length > 0 ? (
        <>
          <List.Section title={suggestionsTitle}>{suggested.map(renderItem)}</List.Section>
          <List.Section title="All Items">{others.map(renderItem)}</List.Section>
        </>
      ) : (
        others.map(renderItem)
      )}
    </List>
  );
}
