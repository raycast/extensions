import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Keyboard,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import { memo, type ReactElement } from "react";
import { canFillFrontmostApp, fillApp, getTargetApp } from "./autofill";
import { TOTP_ICON } from "./utils";
import { toOpenableUrl, websiteLabels } from "./format";
import { ItemDetailStore } from "./item-detail-store";
import { fieldsOf } from "./item-fields";
import { ItemView } from "./item-view";
import { NoteView } from "./note-view";
import { rowIcon } from "./row-icons";
import { platformShortcut } from "./shortcuts";
import { SortByMenu, SortOrder } from "./sort";
import { generateTotp, parseOtpauthUri } from "./totp";
import { CustomField, Item, ItemDetail } from "./types";
import { getCurrentTotpCode } from "./use-totp-code";

/** What Copy gives for a custom field: a TOTP field's current code rather than its secret. */
function customFieldValue(field: CustomField): string {
  if (field.type !== "totp") return field.value;
  const params = parseOtpauthUri(field.value);
  if (!params) throw new Error("This code can't be generated here.");
  return generateTotp(params).code;
}

interface ItemActionsProps {
  item: Item;
  detail?: ItemDetail;
  store: ItemDetailStore;
  /** Given in the list only: the item view has no details panel. */
  isShowingDetail?: boolean;
  onToggleDetail?: () => void;
  onRefresh?: () => void;
  onUse: (item: Item) => void;
  /** Given in the list only, like isShowingDetail. */
  sortOrder?: SortOrder;
  onSortOrderChange?: (order: SortOrder) => void;
}

export const ItemActions = memo(function ItemActions({
  item,
  detail,
  store,
  isShowingDetail,
  onToggleDetail,
  onRefresh,
  onUse,
  sortOrder,
  onSortOrderChange,
}: ItemActionsProps) {
  const preferences = getPreferenceValues<Preferences>();
  // Keeps secrets out of Raycast's clipboard history.
  const concealSecrets = preferences.copyPasswordTransient ?? true;
  // Loaded details are newer than the cached item, e.g. when a password was added since.
  const hasPassword = item.type === "login" && (detail ? detail.password !== undefined : item.hasPassword !== false);
  // Like the rows shown, field actions use the loaded details, which are newer than the cached item.
  const { title, username, email } = detail ?? item;
  // Until the details are loaded, the cached item may be outdated: Copy Password then checks when used.
  const canCopyPassword = item.type === "login" && (!detail || detail.password !== undefined);
  const canFill = canFillFrontmostApp && hasPassword;
  const isNote = item.type === "note";
  const hasNote = isNote || Boolean(item.hasNote || detail?.note);
  const urls = detail?.urls ?? item.urls ?? [];
  const websiteNames = websiteLabels(urls);
  // Until the details are loaded, the fields always shown are offered, and checked when copied, like the password.
  const typeFields = fieldsOf(item.type).filter((spec) =>
    detail ? detail.fields?.[spec.id] !== undefined : !spec.optional,
  );

  async function loadDetail(): Promise<ItemDetail> {
    const loaded = store.peek(item);
    if (loaded) return loaded;
    await showToast({ style: Toast.Style.Animated, title: "Loading Item…" });
    return store.load(item);
  }

  /** Like Raycast's own Copy actions, Raycast closes once copied; it stays open while loading and on failure. */
  async function copy(label: string, getValue: () => Promise<string | undefined>, isSecret: boolean) {
    try {
      const value = await getValue();
      if (!value) {
        await showToast({ style: Toast.Style.Failure, title: `No ${label} Saved for This Item` });
        return;
      }
      await Clipboard.copy(value, { concealed: isSecret && concealSecrets });
      onUse(item);
      // The HUD closes Raycast's window.
      await showHUD(`${label} Copied`);
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to Copy ${label}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function getTotpCode(): Promise<string> {
    return getCurrentTotpCode(item, store.peek(item));
  }

  /** Pastes into the app that was in front of Raycast; the TOTP code is then left in the clipboard. */
  async function fill(fields: "login" | "email" | "username" | "password") {
    try {
      // Taken first: loading the item can take a moment, during which another app could come in front. Raycast stays
      // open while it loads, with its toast, and closes to fill.
      const target = await getTargetApp();
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
      await fillApp(target, {
        values,
        submit: fields === "login" && preferences.submitAfterFill,
        getClipboardValue:
          fields === "login" || fields === "password" ? (item.hasTotp ? getTotpCode : undefined) : undefined,
        clipboardValueHud: "TOTP code copied, paste it with ⌘V",
        clipboardValueFailureHud: "Filled, but couldn't copy the TOTP code",
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
      const target = await getTargetApp();
      // Without the item's details, the code comes from pass-cli.
      if (!store.peek(item)) await showToast({ style: Toast.Style.Animated, title: "Loading TOTP Code…" });
      const code = await getTotpCode();
      onUse(item);
      await fillApp(target, { values: [code] });
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Paste TOTP Code",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // The item view shows the full note and has no panel: View Details and Show Note are only offered in the list.
  const isInList = onToggleDetail !== undefined;
  const viewDetailsAction = isInList ? (
    <Action.Push
      key="view-details"
      title="View Details"
      icon={Icon.Info}
      target={<ItemView item={item} store={store} onUse={onUse} />}
      onPush={() => onUse(item)}
    />
  ) : null;
  const showNoteAction =
    isInList && hasNote ? (
      <Action.Push
        key="show-note"
        title="Show Note"
        icon={Icon.Eye}
        shortcut={platformShortcut(["cmd", "shift"], "n")}
        target={<NoteView item={item} store={store} />}
      />
    ) : null;
  const copyNoteAction = hasNote ? (
    <Action
      key="copy-note"
      title="Copy Note"
      icon={Icon.Document}
      shortcut={platformShortcut(["cmd"], "n")}
      onAction={() => copy("Note", async () => (await loadDetail()).note, true)}
    />
  ) : null;
  const copyPasswordAction = canCopyPassword ? (
    <Action
      key="copy-password"
      title="Copy Password"
      icon={Icon.Key}
      shortcut={Keyboard.Shortcut.Common.Copy}
      onAction={() => copy("Password", async () => (await loadDetail()).password, true)}
    />
  ) : null;
  const copyTotpAction = item.hasTotp ? (
    <Action
      key="copy-totp"
      title="Copy TOTP Code"
      icon={TOTP_ICON}
      shortcut={platformShortcut(["cmd"], "t")}
      onAction={() => copy("TOTP Code", getTotpCode, true)}
    />
  ) : null;
  const fillAction = canFill ? (
    <Action key="fill" title="Fill Login" icon={Icon.Keyboard} onAction={() => fill("login")} />
  ) : null;
  const pastePasswordAction =
    canFillFrontmostApp && hasPassword ? (
      <Action
        key="paste-password"
        title="Paste Password"
        icon={Icon.Key}
        shortcut={platformShortcut(["cmd", "shift"], "p")}
        onAction={() => fill("password")}
      />
    ) : null;
  const pasteTotpAction =
    canFillFrontmostApp && item.hasTotp ? (
      <Action
        key="paste-totp"
        title="Paste TOTP Code"
        icon={TOTP_ICON}
        shortcut={platformShortcut(["cmd", "shift"], "t")}
        onAction={pasteTotpCode}
      />
    ) : null;
  const openWebsiteAction = urls[0] ? (
    <Action.OpenInBrowser
      key="open-website"
      title="Open Website"
      url={toOpenableUrl(urls[0])}
      shortcut={Keyboard.Shortcut.Common.Open}
      onOpen={() => onUse(item)}
    />
  ) : null;

  const copyActions = [
    copyPasswordAction,
    isNote && showNoteAction,
    isNote && copyNoteAction,
    ...typeFields.map((spec) => (
      <Action
        key={spec.id}
        title={`Copy ${spec.title}`}
        icon={rowIcon(spec.id) ?? Icon.Clipboard}
        shortcut={spec.isMain ? Keyboard.Shortcut.Common.Copy : undefined}
        onAction={() => copy(spec.title, async () => (await loadDetail()).fields?.[spec.id], Boolean(spec.secret))}
      />
    )),
    username && (
      <Action
        key="copy-username"
        title="Copy Username"
        icon={Icon.Person}
        shortcut={platformShortcut(["cmd", "shift"], "u")}
        onAction={() => copy("Username", async () => username, false)}
      />
    ),
    email && (
      <Action
        key="copy-email"
        title="Copy Email"
        icon={Icon.Envelope}
        shortcut={platformShortcut(["cmd", "opt"], "c")}
        onAction={() => copy("Email", async () => email, false)}
      />
    ),
    copyTotpAction,
    <Action
      key="copy-title"
      title="Copy Title"
      icon={Icon.Text}
      // ⌘⇧. like Copy Name on macOS; Copy Name's Windows shortcut (Ctrl+Alt+C) is Copy Email's here.
      shortcut={platformShortcut(["cmd", "shift"], ".")}
      onAction={() => copy("Title", async () => title, false)}
    />,
  ];
  // Fill Login heads the Paste section where it isn't Enter's action.
  const pasteActions = canFillFrontmostApp
    ? [
        fillAction,
        email && <Action key="paste-email" title="Paste Email" icon={Icon.Envelope} onAction={() => fill("email")} />,
        username && (
          <Action key="paste-username" title="Paste Username" icon={Icon.Person} onAction={() => fill("username")} />
        ),
        pastePasswordAction,
        pasteTotpAction,
      ]
    : [];

  // Each Primary Action choice, then what it falls back to: where Raycast can't paste (Windows), Fill Login and the
  // Paste choices copy instead. Copy Password only takes Enter where the item is known to have a password.
  const enterChoices: Record<Preferences["primaryAction"], (ReactElement | null)[]> = {
    details: [viewDetailsAction],
    copy: [hasPassword ? copyPasswordAction : null],
    pastePassword: [pastePasswordAction, hasPassword ? copyPasswordAction : null],
    fill: [fillAction, hasPassword ? copyPasswordAction : null],
    copyTotp: [copyTotpAction],
    pasteTotp: [pasteTotpAction, copyTotpAction],
    openWebsite: [openWebsiteAction],
  };
  // Where the item lacks the chosen action, an item opens its details and a note shows its note. The item view has
  // neither: its first Copy action takes Enter.
  const enterAction =
    (enterChoices[preferences.primaryAction ?? "details"] ?? []).find(Boolean) ??
    (isNote ? showNoteAction : viewDetailsAction) ??
    copyActions.find(Boolean);
  /** The actions of a section, without Enter's, which stands alone at the top. */
  const without = (actions: (ReactElement | null | false | undefined | "")[]) =>
    actions.filter((action): action is ReactElement => Boolean(action) && action !== enterAction);
  const otherPasteActions = without(pasteActions);

  return (
    <ActionPanel>
      <ActionPanel.Section>{enterAction}</ActionPanel.Section>
      <ActionPanel.Section>{without(copyActions)}</ActionPanel.Section>
      {otherPasteActions.length > 0 && <ActionPanel.Section title="Paste">{otherPasteActions}</ActionPanel.Section>}
      <ActionPanel.Section>
        {without([openWebsiteAction])}
        {urls[0] && (
          <Action
            title="Copy Website URL"
            icon={Icon.Link}
            shortcut={platformShortcut(["cmd"], "u")}
            onAction={() => copy("URL", async () => urls[0], false)}
          />
        )}
        {!isNote && without([showNoteAction, copyNoteAction])}
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
              onAction={() =>
                copy(field.name, async () => customFieldValue(field), field.type === "hidden" || field.type === "totp")
              }
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
        {without([viewDetailsAction])}
        {isInList && (
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.AppWindowSidebarRight}
            shortcut={platformShortcut(["cmd"], "d")}
            onAction={onToggleDetail}
          />
        )}
        {sortOrder && onSortOrderChange && <SortByMenu value={sortOrder} onChange={onSortOrderChange} />}
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
                  hasUsername: Boolean(username),
                  hasEmail: Boolean(email),
                  urlCount: urls.length,
                  hasTotp: item.hasTotp,
                  hasNote: detail ? Boolean(detail.note) : undefined,
                  customFieldsCount: detail ? (detail.customFields?.length ?? 0) : undefined,
                  // The names of the filled fields only, never their values.
                  filledFields: detail ? Object.keys(detail.fields ?? {}) : undefined,
                },
                null,
                2,
              ),
            );
            await showHUD("Debug Info Copied");
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
});
