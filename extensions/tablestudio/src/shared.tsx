import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  CatalogError,
  CatalogItem,
  CatalogResult,
  SearchCategory,
  StoredCredentials,
  loadCatalog,
  storeCredentials,
} from "./catalog";

/** Launches TableStudio without navigating anywhere — the bare scheme just opens the app. */
export const APP_URL = "tablestudio://";

export const CATEGORY_ICONS: Record<SearchCategory, Icon> = {
  connection: Icon.HardDrive,
  table: Icon.AppWindowGrid3x3,
  snippet: Icon.Code,
  query: Icon.Terminal,
  localDatabase: Icon.Desktop,
};

/**
 * Green when a local database is up, orange mid-transition, grey when it isn't.
 *
 * Keyed on `statusKind`, never on the displayed `status`: that one is `String(localized:)` in
 * TableStudio, so a German or Chinese app would send "Läuft" and every row would come back red.
 */
export function statusColor(kind: string | undefined): Color {
  switch (kind) {
    case "running":
    case "ready":
      return Color.Green;
    case "starting":
    case "stopping":
      return Color.Orange;
    case "stopped":
      return Color.SecondaryText;
    default:
      return Color.Red;
  }
}

/** Nothing more is going to happen on its own — safe to stop polling after a start/stop. */
export function isSettled(kind: string | undefined): boolean {
  return kind !== "starting" && kind !== "stopping";
}

export async function openLink(link: string, successMessage?: string) {
  try {
    await open(link);
    if (successMessage) {
      await showToast({ style: Toast.Style.Success, title: successMessage });
    }
  } catch {
    // The deep link only fails when the app isn't installed — every other case is
    // handled inside TableStudio, which reports back with its own notification.
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't reach TableStudio",
      message: "Make sure TableStudio is installed.",
    });
  }
}

interface CatalogState {
  items: CatalogItem[];
  error?: CatalogError;
  isStale: boolean;
  isLoading: boolean;
}

/**
 * Fetches the catalog and keeps it in state. Shared by both commands so the credential handoff,
 * the offline-copy fallback and the error taxonomy exist in exactly one place.
 *
 * `reload` resolves with the result so a caller can poll until something settles — see the
 * start/stop flow in `localdatabases.tsx`.
 */
export function useCatalog(incoming?: Partial<StoredCredentials>) {
  const [state, setState] = useState<CatalogState>({
    items: [],
    isStale: false,
    isLoading: true,
  });

  // Depend on the token itself rather than the object: Raycast hands `launchContext` in as a
  // fresh object shape, and an identity-based dependency would refetch on every render.
  const incomingToken = incoming?.token;
  const incomingPort = incoming?.port;

  const load = useCallback(async (): Promise<CatalogResult> => {
    setState((previous) => ({ ...previous, isLoading: true }));

    // A deeplink from TableStudio carries the token; persist it before the first fetch so the
    // very launch that connects also shows results.
    const stored = await storeCredentials({
      token: incomingToken,
      port: incomingPort,
    });
    if (stored)
      await showToast({
        style: Toast.Style.Success,
        title: "Connected to TableStudio",
      });

    const result = await loadCatalog();
    setState({
      items: result.items,
      error: result.error,
      isStale: result.stale,
      isLoading: false,
    });
    return result;
  }, [incomingToken, incomingPort]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

/**
 * The whole screen when there's nothing to show. Every one of these is fixed in TableStudio's
 * settings rather than Raycast's, so the lead action sends the user to the app instead of to a
 * preferences form they'd have to paste into by hand.
 */
export function CatalogErrorView({ error, onRetry }: { error: CatalogError; onRetry: () => void }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title={emptyTitle(error)}
        description={emptyDescription(error)}
        actions={
          <ActionPanel>
            <Action title="Open TableStudio" icon={Icon.AppWindow} onAction={() => openLink(APP_URL)} />
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
            <Action title="Set Token Manually" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

/**
 * A row you can open in TableStudio. `extraActions` come first when present, so the primary `↵`
 * is whatever the row is actually for — Raycast assigns `↵` to the first action and `⌘↵` to the
 * second automatically.
 */
export function CatalogRow({
  item,
  isStale,
  onRefresh,
  accessories,
  extraActions,
  onOpen,
  onResetRanking,
}: {
  item: CatalogItem;
  isStale: boolean;
  onRefresh: () => void;
  accessories?: List.Item.Accessory[];
  extraActions?: React.ReactNode;
  /** Called when the row is opened in TableStudio — feeds frecency sorting. */
  onOpen?: () => void;
  onResetRanking?: () => void;
}) {
  return (
    <List.Item
      title={item.title}
      subtitle={item.subtitle}
      // Raycast searches these alongside the title, so a table is findable by its columns.
      keywords={item.keywords}
      accessories={accessories}
      icon={{
        source: CATEGORY_ICONS[item.category],
        tintColor: item.color ? { light: item.color, dark: item.color, adjustContrast: true } : Color.SecondaryText,
      }}
      actions={
        <ActionPanel>
          {extraActions}
          {/* Works from a cached row too: the deep link launches TableStudio, which then
              navigates once it's up. */}
          <Action
            title="Open in TableStudio"
            icon={Icon.ArrowRight}
            onAction={() => {
              onOpen?.();
              openLink(item.id);
            }}
          />
          <Action.CopyToClipboard
            title="Copy Deep Link"
            content={item.id}
            // Pinned rather than left to position: on a table it would land on ⌘↵, on a
            // connection (third action) on nothing at all.
            shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
          />
          {isStale && (
            <Action
              title="Refresh from TableStudio"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          )}
          {onResetRanking && (
            <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={onResetRanking} />
          )}
        </ActionPanel>
      }
    />
  );
}

function emptyTitle(error: CatalogError): string {
  switch (error.kind) {
    case "notConnected":
      return "Not connected yet";
    case "unreachable":
      return "TableStudio isn't running";
    case "unauthorized":
      return "Token not accepted";
    case "notPublished":
      return "Nothing published yet";
    case "unsupportedVersion":
      return "TableStudio is newer than this extension";
    case "unreadable":
      return "Couldn't read the catalog";
  }
}

function emptyDescription(error: CatalogError): string {
  switch (error.kind) {
    case "notConnected":
      return 'In TableStudio, open Settings → Search & Launchers, turn on "Raycast", and click Connect Raycast. That sets everything up for you.';
    case "unreachable":
      return "Open TableStudio and try again. To search while it's closed, turn on Offline Access in this extension's settings.";
    case "unauthorized":
      return "Copy the token from TableStudio → Settings → Search & Launchers and paste it into this extension's settings.";
    case "notPublished":
      return 'In TableStudio, open Settings → Search & Launchers and turn on "Raycast".';
    case "unsupportedVersion":
      return `This extension understands catalog version 1, but TableStudio is sending version ${error.found}. Update the extension.`;
    case "unreadable":
      return error.message;
  }
}
