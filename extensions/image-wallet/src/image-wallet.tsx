import { openExtensionPreferences, ActionPanel, Action, Grid, Icon, Keyboard, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { useMemo, useState, ReactNode } from "react";

import { walletPath, walletStatus, fetchFiles, purgePreviews } from "./utils";
import { displayName, previewSource, primaryModifierLabel } from "./platform";
import { useCardSorting } from "./hooks/useCardSorting";
import { usePdfThumbnails } from "./hooks/usePdfThumbnails";
import { useTooltipFields } from "./hooks/useTooltipFields";
import { sortCards } from "./lib/sort";
import { SORT_OPTIONS } from "./lib/sortPreference";
import { cardTooltip } from "./lib/cardTooltip";
import { TooltipFieldsView } from "./components/TooltipFieldsView";
import { Card, Pocket, Preferences, ThumbnailLayout, TooltipField, UsageStats } from "./types";

// Raycast maps "cmd" to the Windows key on Windows, so every custom shortcut has to
// declare its Ctrl-based Windows counterpart explicitly.
const SHORTCUT_SHOW_IN_FILE_BROWSER: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "o" },
  Windows: { modifiers: ["ctrl"], key: "o" },
};

const SHORTCUT_EDIT_WALLET: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "e" },
  Windows: { modifiers: ["ctrl"], key: "e" },
};

const SHORTCUT_CHANGE_DIRECTORY: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "e" },
  Windows: { modifiers: ["ctrl", "shift"], key: "e" },
};

const SHORTCUT_RESET_PREVIEWS: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "r" },
  Windows: { modifiers: ["ctrl", "shift"], key: "r" },
};

const SHORTCUT_SORT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "s" },
  Windows: { modifiers: ["ctrl", "shift"], key: "s" },
};

const SHORTCUT_CONFIGURE_TOOLTIP: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "t" },
  Windows: { modifiers: ["ctrl", "shift"], key: "t" },
};

const MIN_COLUMNS = 1;
const MAX_COLUMNS = 8;
const DEFAULT_COLUMNS = 5;

export default function Command() {
  const [pocketFilter, setPocketFilter] = useState<string>();
  const {
    isLoading,
    data: pockets,
    error: scanError,
    revalidate,
  } = usePromise(fetchFiles, [], {
    // A custom error screen (below) replaces the default failure toast.
    onError: noop,
  });
  const { sortMode, setSortMode, usage, markUsed, isSortLoaded } = useCardSorting(pockets);
  const { fields: tooltipFields, reload: reloadTooltipFields, isTooltipFieldsLoaded } = useTooltipFields();
  const pdfThumbnails = usePdfThumbnails(pockets);
  const preferences = getPreferenceValues<Preferences>();

  const visiblePockets = useMemo(() => selectPockets(pockets, pocketFilter), [pockets, pocketFilter]);
  const cardCount = visiblePockets.reduce((total, pocket) => total + pocket.cards.length, 0);

  if (walletStatus !== "ready") {
    return <WalletProblemView />;
  }

  if (scanError) {
    return <WalletProblemView unreadableMessage={scanError.message} onRetry={revalidate} />;
  }

  const layout = layoutProps(preferences.thumbnailLayout);

  return (
    <Grid
      columns={resolveColumns(preferences.gridColumns)}
      isLoading={isLoading || !isSortLoaded || !isTooltipFieldsLoaded}
      {...layout}
      searchBarPlaceholder={`Search ${cardCount} Card${cardCount != 1 ? "s" : ""}`}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Pocket"
          storeValue={preferences.rememberPocketFilter}
          onChange={(newValue) => setPocketFilter(newValue)}
          defaultValue="All Cards"
          key="Dropdown"
        >
          <Grid.Dropdown.Item title="All Cards" value="" key="" icon={Icon.Wallet} />
          <Grid.Dropdown.Item title="Unsorted" value=".unsorted" key=".unsorted" icon={Icon.Filter} />
          <Grid.Dropdown.Section title="Pockets" key="Section">
            {pocketNames(pockets).map((name) => (
              <Grid.Dropdown.Item title={displayName(name)} value={name} key={name} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
      actions={<ActionPanel>{loadGenericActionNodes()}</ActionPanel>}
    >
      {loadPocketNodes()}
    </Grid>
  );

  function loadPocketNodes() {
    const nodes: ReactNode[] = visiblePockets.map((pocket) => (
      <Grid.Section
        title={pocketFilter ? undefined : (pocket.name && displayName(pocket.name)) || undefined}
        key={pocket.name || ".unsorted"}
      >
        {sortCards(pocket.cards, sortMode, usage).map((card) => (
          <Grid.Item
            key={card.path}
            content={cardContent(card, pdfThumbnails, usage, tooltipFields)}
            title={displayName(card.name)}
            keywords={[card.name]}
            actions={loadCardActionNodes(card)}
            quickLook={{ name: card.name, path: card.path }}
          />
        ))}
      </Grid.Section>
    ));

    nodes.push(
      <Grid.EmptyView
        title="No Cards Found"
        key="Empty View"
        description={`Use ${primaryModifierLabel}E to add images to the Wallet directory!`}
      />
    );

    return nodes;
  }

  function loadCardActionNodes(item: Card) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.Paste content={{ file: item.path }} onPaste={() => markUsed(item.path)} />
          <Action.CopyToClipboard content={{ file: item.path }} onCopy={() => markUsed(item.path)} />
          <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
          {/* Raycast titles this "Show in Finder" on macOS and "Show in Explorer" on Windows. */}
          <Action.ShowInFinder path={item.path} shortcut={SHORTCUT_SHOW_IN_FILE_BROWSER} />
        </ActionPanel.Section>
        {loadGenericActionNodes()}
      </ActionPanel>
    );
  }

  function loadGenericActionNodes() {
    return (
      <ActionPanel.Section>
        {/* The search bar accessory can only hold one dropdown, and that is the Pocket filter,
            so the sort mode lives here instead. */}
        <ActionPanel.Submenu title="Sort Cards By" icon={Icon.ArrowDown} shortcut={SHORTCUT_SORT}>
          {SORT_OPTIONS.map((option) => (
            <Action
              key={option.value}
              title={option.title}
              icon={sortMode === option.value ? Icon.Checkmark : Icon.Circle}
              onAction={() => setSortMode(option.value)}
            />
          ))}
        </ActionPanel.Submenu>
        <Action.Push
          title="Configure Card Tooltip"
          icon={Icon.Tag}
          shortcut={SHORTCUT_CONFIGURE_TOOLTIP}
          target={<TooltipFieldsView />}
          onPop={reloadTooltipFields}
        />
        <Action.ShowInFinder title="Edit Wallet" shortcut={SHORTCUT_EDIT_WALLET} path={walletPath} />
        <Action
          title="Change Wallet Directory"
          icon={Icon.Folder}
          shortcut={SHORTCUT_CHANGE_DIRECTORY}
          onAction={openExtensionPreferences}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
        <Action
          title="Reset Previews"
          icon={Icon.ArrowClockwise}
          shortcut={SHORTCUT_RESET_PREVIEWS}
          onAction={purgeRevalidate}
        />
      </ActionPanel.Section>
    );
  }

  function purgeRevalidate() {
    purgePreviews();
    revalidate();
  }
}

function WalletProblemView({ unreadableMessage, onRetry }: { unreadableMessage?: string; onRetry?: () => void } = {}) {
  const { walletDirectory } = getPreferenceValues<Preferences>();

  const icon = unreadableMessage || walletStatus === "not-found" ? Icon.ExclamationMark : Icon.Folder;
  const title = unreadableMessage
    ? "Wallet Directory Unreadable"
    : walletStatus === "missing"
    ? "No Wallet Directory Selected"
    : "Wallet Directory Not Found";
  const description =
    unreadableMessage ??
    (walletStatus === "missing"
      ? "Choose a directory in the extension preferences to start browsing your Cards."
      : `"${walletDirectory}" no longer exists. Choose another directory in the extension preferences.`);

  return (
    <Grid>
      <Grid.EmptyView
        icon={icon}
        title={title}
        description={description}
        actions={
          <ActionPanel>
            <Action title="Change Wallet Directory" icon={Icon.Gear} onAction={openExtensionPreferences} />
            {onRetry && (
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={onRetry}
              />
            )}
          </ActionPanel>
        }
      />
    </Grid>
  );
}

function selectPockets(pockets: Pocket[] | undefined, pocketFilter?: string): Pocket[] {
  if (!pockets) return [];
  if (!pocketFilter) return pockets;

  const selected =
    pocketFilter === ".unsorted"
      ? pockets.find((pocket) => !pocket.name)
      : pockets.find((pocket) => pocket.name === pocketFilter);

  return selected ? [selected] : [];
}

function pocketNames(pockets: Pocket[] | undefined): string[] {
  return (pockets ?? []).map((pocket) => pocket.name).filter((name): name is string => name !== undefined);
}

function cardContent(
  card: Card,
  pdfThumbnails: Record<string, string>,
  usage: UsageStats,
  tooltipFields: TooltipField[]
) {
  const preview = card.preview ?? pdfThumbnails[card.path];
  const value = preview ? previewSource(preview) : { fileIcon: card.path };
  return { value, tooltip: cardTooltip(card, tooltipFields, usage) };
}

/** "inset" reproduces the original look: the image centred in its cell with padding around it. */
function layoutProps(layout: ThumbnailLayout) {
  switch (layout) {
    case "contain":
      return { fit: Grid.Fit.Contain };
    case "fill":
      return { fit: Grid.Fit.Fill };
    default:
      return { inset: Grid.Inset.Large };
  }
}

function noop() {
  // A custom error screen replaces usePromise's default failure toast.
}

function resolveColumns(preference: string): number {
  const columns = Number.parseInt(preference, 10);
  if (Number.isNaN(columns)) return DEFAULT_COLUMNS;
  return Math.min(Math.max(columns, MIN_COLUMNS), MAX_COLUMNS);
}
