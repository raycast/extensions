/* Gold and Silver Prices: every karat per gram, the gold and silver pounds, and the world ounce price. */
import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { GENEH_GOLD, GENEH_SILVER, genehMetal, genehSpot, type Metal } from "./lite.js";
import { useFeed } from "./feed";
import { genehUrl, lang as prefLang, metalName, num, updated, words, type Lang } from "./words";

export default function Gold() {
  const l = prefLang();
  const w = words(l);
  const { data, isLoading, error, revalidate } = useFeed();
  const snap = data?.snap;
  const list = (kind: "gold" | "silver", table: Record<string, string>) =>
    Object.keys(table)
      .map((k) => genehMetal(snap, kind, k))
      .filter((m): m is Metal => m != null && (m.sell != null || m.buy != null));
  const gold = list("gold", GENEH_GOLD);
  const silver = list("silver", GENEH_SILVER);
  const goldOz = genehSpot(snap, "gold");
  const silverOz = genehSpot(snap, "silver");

  const item = (m: Metal, kind: "gold" | "silver", lng: Lang) => (
    <List.Item
      key={m.instrument}
      icon={{ source: Icon.CircleFilled, tintColor: kind === "gold" ? "#AE8216" : "#9AA0A6" }}
      title={metalName(m.instrument, lng)}
      subtitle={m.instrument.endsWith("pound") ? w.perPound : w.perGram}
      keywords={[metalName(m.instrument, lng === "ar" ? "en" : "ar"), m.instrument.replace(/\D/g, "")]}
      accessories={[{ text: `${w.sell} ${num(m.sell, lng)}` }, { text: `${w.buy} ${num(m.buy, lng)}` }]}
      actions={
        <ActionPanel>
          {m.sell != null && <Action.CopyToClipboard title={w.copyPrice} content={String(m.sell)} />}
          <Action.OpenInBrowser title={w.open} url={genehUrl(lng, kind)} />
          <Action
            icon={Icon.ArrowClockwise}
            title={w.reload}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder={w.searchGold}>
      {error && !data ? (
        <List.EmptyView icon={Icon.WifiDisabled} title={w.failed} description={w.failedHint} />
      ) : (
        <>
          <List.Section title={w.gold} subtitle={updated(snap?.generatedAt, l)}>
            {gold.map((m) => item(m, "gold", l))}
          </List.Section>
          <List.Section title={w.silver}>{silver.map((m) => item(m, "silver", l))}</List.Section>
          {(goldOz != null || silverOz != null) && (
            <List.Section title={w.ounce}>
              {goldOz != null && (
                <List.Item icon={Icon.Globe} title={w.gold} accessories={[{ text: `$${num(goldOz, l)}` }]} />
              )}
              {silverOz != null && (
                <List.Item icon={Icon.Globe} title={w.silver} accessories={[{ text: `$${num(silverOz, l)}` }]} />
              )}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
