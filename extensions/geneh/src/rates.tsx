/* Exchange Rates: every currency with the cheapest bank to buy it and the best bank to sell it. */
import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { GENEH_CCY, genehBoard, type Board } from "./lite.js";
import { bankName, useFeed, type Feed } from "./feed";
import { bankLogo, flag } from "./icons";
import { currencyName, genehUrl, lang as prefLang, num, updated, words, type Lang } from "./words";

export default function Rates() {
  const l = prefLang();
  const w = words(l);
  const { data, isLoading, error, revalidate } = useFeed();
  const boards = GENEH_CCY.map((c) => genehBoard(data?.snap, c)).filter((b): b is Board => b != null);

  return (
    <List isLoading={isLoading} searchBarPlaceholder={w.searchRates}>
      {error && !data ? (
        <List.EmptyView icon={Icon.WifiDisabled} title={w.failed} description={w.failedHint} />
      ) : (
        <List.Section title={updated(data?.snap.generatedAt, l)}>
          {boards.map((b) => (
            <CurrencyItem key={b.currency} board={b} feed={data} l={l} reload={revalidate} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function CurrencyItem({ board, feed, l, reload }: { board: Board; feed?: Feed; l: Lang; reload: () => void }) {
  const w = words(l);
  const name = currencyName(board.currency, l);
  const code = board.currency.toUpperCase();
  const sell = board.best?.sell.rate;
  const buy = board.best?.buy.rate;
  return (
    <List.Item
      icon={flag(board.currency)}
      title={name}
      subtitle={code}
      keywords={[code, board.currency, currencyName(board.currency, l === "ar" ? "en" : "ar")]}
      accessories={[
        { text: `${w.lowSell} ${num(sell, l)}`, tooltip: w.cheapestBuy },
        { text: `${w.hiBuy} ${num(buy, l)}`, tooltip: w.bestSell },
      ]}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.List} title={w.showBanks} target={<Banks board={board} feed={feed} l={l} />} />
          {sell != null && <Action.CopyToClipboard title={w.copySell} content={String(sell)} />}
          {buy != null && <Action.CopyToClipboard title={w.copyBuy} content={String(buy)} />}
          <Action.OpenInBrowser title={w.open} url={genehUrl(l, `currencies/${board.currency}`)} />
          <Action
            icon={Icon.ArrowClockwise}
            title={w.reload}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={reload}
          />
        </ActionPanel>
      }
    />
  );
}

/** One currency at every bank, cheapest sell first, with the Central Bank on its own at the top. */
function Banks({ board, feed, l }: { board: Board; feed?: Feed; l: Lang }) {
  const w = words(l);
  const best = board.best;
  const unit = board.unit > 1 ? ` (${num(board.unit, l)})` : "";
  return (
    <List navigationTitle={currencyName(board.currency, l) + unit} searchBarPlaceholder={w.searchBanks}>
      {board.cbe && (
        <List.Section title={w.cbe}>
          <List.Item
            icon={bankLogo("cbe")}
            title={w.cbe}
            accessories={[
              { text: `${w.buy} ${num(board.cbe.buy, l)}` },
              { text: `${w.sell} ${num(board.cbe.sell, l)}` },
            ]}
          />
        </List.Section>
      )}
      <List.Section title={w.banks}>
        {board.banks.map((b) => {
          const name = bankName(feed, b.bank, l);
          const low = !b.behind && best?.sell.banks.includes(b.bank);
          const high = !b.behind && best?.buy.banks.includes(b.bank);
          return (
            <List.Item
              key={b.bank}
              icon={bankLogo(b.bank)}
              title={name}
              subtitle={b.behind ? w.behind : undefined}
              keywords={[bankName(feed, b.bank, l === "ar" ? "en" : "ar"), b.bank]}
              accessories={[
                high
                  ? { tag: { value: `${w.buy} ${num(b.buy, l)}`, color: "#AE8216" }, tooltip: w.bestSell }
                  : { text: `${w.buy} ${num(b.buy, l)}` },
                low
                  ? { tag: { value: `${w.sell} ${num(b.sell, l)}`, color: "#AE8216" }, tooltip: w.cheapestBuy }
                  : { text: `${w.sell} ${num(b.sell, l)}` },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title={w.copyPrice} content={String(b.sell)} />
                  <Action.OpenInBrowser title={w.open} url={genehUrl(l, `banks/${b.bank}`)} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
