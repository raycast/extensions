import { Clipboard, Icon, MenuBarExtra, getPreferenceValues, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Fragment } from "react";
import MenuBarFooter, { ConfigureCommandItem, relaunchCommand } from "./components/MenuBarFooter";
import { RATES_TTL, STORAGE_KEYS } from "./data/constants";
import { shortcuts } from "./data/shortcuts";
import { getPreviousSnapshot, toLocalDay } from "./services/rateHistory";
import { loadRates } from "./services/rates";
import { readJson, writeJson } from "./services/storage";
import { CurrencyRate } from "./types";
import {
  formatChangeSince,
  formatRateChange,
  formatRateChangeTooltip,
  getChangeField,
  getFlagImage,
  getMenuBarRate,
  getRateChange,
  getRateMenuBarTitle,
  getRateSubtitle,
  getRateTitle,
} from "./utils";

/**
 * The rates, the ones pinned in "Show Currency Rates", the one chosen for the title and the previous day's rates,
 * read together so they are all cached. The menu then opens with the chosen rate right away, instead of the
 * default one until the choice is read.
 */
async function loadMenuRates() {
  const [loaded, pinnedIds, selectedId] = await Promise.all([
    loadRates(RATES_TTL),
    readJson<string[]>(STORAGE_KEYS.pinnedRates),
    readJson<string>(STORAGE_KEYS.menuBarRate),
  ]);
  // After `loadRates`, which saves today's snapshot when it fetches.
  const previous = await getPreviousSnapshot(toLocalDay(loaded.updatedAt));
  return { ...loaded, previous, pinnedIds: pinnedIds ?? [], selectedId: selectedId ?? "" };
}

async function copy(value: number) {
  await Clipboard.copy(String(value));
  await showHUD("Copied to Clipboard");
}

export default function Command() {
  const { rateTitle, showRateChange } = getPreferenceValues<Preferences.RatesMenuBar>();
  // Raycast unloads a menu bar command once `isLoading` is false, so the loader does all async work.
  const { data, isLoading, error, mutate } = useCachedPromise(loadMenuRates);
  const rates = data?.rates ?? [];
  const rate = getMenuBarRate(rates, data?.selectedId ?? "", data?.pinnedIds ?? []);

  // Waits for the save, because the command unloads soon after its menu closes.
  const select = (id: string) =>
    mutate(writeJson(STORAGE_KEYS.menuBarRate, id), {
      optimisticUpdate: (current) => ({ ...current!, selectedId: id }),
      shouldRevalidateAfter: false,
    });

  if (!rate) {
    return (
      <MenuBarExtra icon={error ? Icon.Warning : Icon.BankNote} tooltip="monobank" isLoading={isLoading}>
        {error && (
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Couldn't Load Rates" subtitle="Try Again" onAction={relaunchCommand} />
          </MenuBarExtra.Section>
        )}
        <MenuBarExtra.Section>
          <ConfigureCommandItem />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  const pinnedRates = (data?.pinnedIds ?? [])
    .map((id) => rates.find((item) => item.id === id))
    .filter((item): item is CurrencyRate => !!item && item.id !== rate.id);
  const otherRates = rates.filter((item) => item.id !== rate.id && !pinnedRates.includes(item));

  const previous = data?.previous;
  const getChange = (item: CurrencyRate) => getRateChange(item, previous, getChangeField(item, rateTitle));
  const change = getChange(rate);

  const renderRate = (item: CurrencyRate) => {
    const itemChange = getChange(item);
    return (
      <MenuBarExtra.Item
        key={item.id}
        icon={getFlagImage(item.currencyA.code)}
        title={getRateTitle(item)}
        subtitle={getRateSubtitle(item) + (itemChange ? `  ${formatRateChange(itemChange.delta)}` : "")}
        tooltip={`Show ${getRateTitle(item)} in the menu bar`}
        onAction={() => select(item.id)}
      />
    );
  };

  return (
    <MenuBarExtra
      icon={getFlagImage(rate.currencyA.code)}
      title={getRateMenuBarTitle(rate, rateTitle, showRateChange ? change : undefined)}
      tooltip={`${getRateTitle(rate)} · monobank`}
      isLoading={isLoading}
    >
      {/*
        Keyed by the chosen rate, so choosing another one rebuilds these sections. When they're updated in
        place, the menu bar misdraws the changed items: titles go missing and inserted items are indented.
      */}
      <Fragment key={rate.id}>
        <MenuBarExtra.Section title={getRateTitle(rate)}>
          {rate.rateCross !== undefined ? (
            <MenuBarExtra.Item
              title="Copy Cross Rate"
              subtitle={`${rate.rateCross}`}
              icon={Icon.CopyClipboard}
              shortcut={shortcuts.copyRate}
              onAction={() => copy(rate.rateCross!)}
            />
          ) : (
            <>
              {rate.rateSell !== undefined && (
                <MenuBarExtra.Item
                  title="Copy Sell Rate"
                  subtitle={`${rate.rateSell}`}
                  icon={Icon.CopyClipboard}
                  shortcut={shortcuts.copyRate}
                  onAction={() => copy(rate.rateSell!)}
                />
              )}
              {rate.rateBuy !== undefined && (
                <MenuBarExtra.Item
                  title="Copy Buy Rate"
                  subtitle={`${rate.rateBuy}`}
                  icon={Icon.CopyClipboard}
                  onAction={() => copy(rate.rateBuy!)}
                />
              )}
            </>
          )}
          {change && previous && (
            <MenuBarExtra.Item
              title={`${formatRateChange(change.delta)} ${formatChangeSince(previous.day)}`}
              icon={Icon.LineChart}
              tooltip={formatRateChangeTooltip(change, previous.day)}
            />
          )}
        </MenuBarExtra.Section>

        {pinnedRates.length > 0 && (
          <MenuBarExtra.Section title="Pinned">{pinnedRates.map(renderRate)}</MenuBarExtra.Section>
        )}

        {otherRates.length > 0 && (
          <MenuBarExtra.Section>
            <MenuBarExtra.Submenu title="All Rates" icon={Icon.List}>
              {otherRates.map(renderRate)}
            </MenuBarExtra.Submenu>
          </MenuBarExtra.Section>
        )}
      </Fragment>

      <MenuBarFooter
        updatedAt={data?.updatedAt}
        offline={data?.stale || !!error}
        openTitle="Open Currency Rates"
        command="rates"
        openShortcut={shortcuts.open}
      />
    </MenuBarExtra>
  );
}
