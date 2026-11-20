import {
  Action,
  ActionPanel,
  closeMainWindow,
  getPreferenceValues,
  openExtensionPreferences,
  Icon,
  Keyboard,
  List,
  open,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { BASE_URL, searchGear, gearUrl } from "./catalog";

import type { Gear } from "./catalog";
import { formatUsedPrice } from "./pricing";
import { recentHistory, readRecentGear } from "./recents-storage";

import { useState } from "react";

export default function SearchGear() {
  const { priceMarket: market } = getPreferenceValues<Preferences.SearchGear>();
  const [query, setQuery] = useState("");
  const { data: recents = [], mutate: updateRecents, isLoading: loadingRecents } = useCachedPromise(readRecentGear);
  const blank = query.trim().length === 0;
  const ready = query.trim().length >= 2;
  const { data, error, isLoading, revalidate } = useCachedPromise(searchGear, [query.trim()], {
    execute: ready,
    failureToastOptions: { title: "Could not search Sharply" },
  });
  async function openGear(gear: Gear) {
    try {
      await recentHistory.load();
      await open(gearUrl(gear.slug));
      await updateRecents(recentHistory.record(gear));
      await closeMainWindow();
    } catch (error) {
      await showFailureToast(error, { title: "Could not open or save gear" });
    }
  }
  const items = blank ? recents : ready ? (data ?? []) : [];
  const settingsActions = (
    <ActionPanel>
      {ready && (
        <Action
          title="Refresh Results"
          icon={Icon.ArrowClockwise}
          onAction={revalidate}
          shortcut={Keyboard.Shortcut.Common.Refresh}
        />
      )}
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action.OpenInBrowser title="Search Sharply Website" url={`${BASE_URL}/search?q=${encodeURIComponent(query)}`} />
    </ActionPanel>
  );
  return (
    <List
      throttle
      filtering={false}
      onSearchTextChange={setQuery}
      isLoading={blank ? loadingRecents : ready && isLoading}
      searchBarPlaceholder="Search cameras, lenses, and other gear…"
      actions={settingsActions}
    >
      <List.EmptyView
        icon={ready && error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
        title={
          !ready
            ? "Search Sharply Gear"
            : error && !data
              ? "Could Not Search Gear"
              : isLoading && !data
                ? "Searching…"
                : "No Matching Gear"
        }
        description={ready && error && !data ? error.message : "Type at least two characters of a brand or model name."}
        actions={settingsActions}
      />
      <List.Section title={blank ? "Recently Opened" : "Search Results"}>
        {items.map((gear) => (
          <List.Item
            key={gear.slug}
            id={gear.slug}
            title={gear.name}
            subtitle={formatUsedPrice(gear.estimatedUsedPrices, market, gear.estimatedUsedUsdCents)}
            icon={gear.thumbnailUrl ?? Icon.Camera}
            keywords={[gear.slug.replaceAll("-", " "), gear.brandName ?? "", gear.gearType]}
            actions={
              <ActionPanel>
                <Action title="Open Gear Page" icon={Icon.Globe} onAction={() => openGear(gear)} />
                <Action.CopyToClipboard title="Copy Gear Page Link" content={gearUrl(gear.slug)} />
                {ready && (
                  <Action
                    title="Refresh Results"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                )}
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                <Action.OpenInBrowser
                  title="Search Sharply Website"
                  url={`${BASE_URL}/search?q=${encodeURIComponent(query)}`}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
