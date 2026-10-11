import { Action, ActionPanel, Icon, Image, Keyboard, List, getPreferenceValues } from "@raycast/api";
import { showFailureToast, useCachedPromise, useLocalStorage } from "@raycast/utils";
import { RateItem, fetchRates } from "./lib/bonbast";
import { Unit, copyValue, formatUsd, toDisplay, unitLabel } from "./lib/format";

function getItemIcon(item: RateItem): Image.ImageLike {
  if (item.kind === "currency") {
    return item.flag ?? Icon.BankNote;
  }
  if (item.kind === "coin") {
    return Icon.Coins;
  }
  if (item.id === "bitcoin") {
    return Icon.Crypto;
  }
  return Icon.LineChart;
}

export default function RatesCommand() {
  const { unit = "toman" } = getPreferenceValues<{ unit?: Unit }>();
  const { isLoading, data, error, revalidate } = useCachedPromise(fetchRates, [], {
    keepPreviousData: true,
    onError: (err) => {
      showFailureToast(err, { title: "Could not load rates from bonbast.com" });
    },
  });

  const { value: pinned = [], setValue: setPinned } = useLocalStorage<string[]>("pinned", []);

  const togglePin = async (id: string) => {
    const current = pinned ?? [];
    if (current.includes(id)) {
      await setPinned(current.filter((item) => item !== id));
    } else {
      await setPinned([...current, id]);
    }
  };

  if (error && !data) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load rates from bonbast.com"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const items = data?.items ?? [];
  const pinnedIds = pinned ?? [];
  const pinnedItems = items.filter((item) => pinnedIds.includes(item.id));
  const currencyItems = items.filter((item) => item.kind === "currency" && !pinnedIds.includes(item.id));
  const coinItems = items.filter((item) => item.kind === "coin" && !pinnedIds.includes(item.id));
  const marketItems = items.filter((item) => item.kind === "market" && !pinnedIds.includes(item.id));

  const updatedSubtitle = data?.updated ? `Updated ${data.updated} · ${unitLabel(unit)}` : undefined;
  const firstSection =
    pinnedItems.length > 0
      ? "pinned"
      : currencyItems.length > 0
        ? "currencies"
        : coinItems.length > 0
          ? "coins"
          : "markets";

  const renderItem = (item: RateItem) => {
    const isPinned = pinnedIds.includes(item.id);
    const title = item.unit > 1 ? `${item.unit} ${item.name}` : item.name;
    const subtitle = item.kind === "currency" ? item.code : undefined;
    const keywords = [item.id, item.code, item.fa].filter((k): k is string => Boolean(k));

    const isTwoPrice = item.sell !== undefined && item.buy !== undefined;
    const accessories = isTwoPrice
      ? [
          { text: `Sell ${toDisplay(item.sell!, unit)}`, tooltip: item.fa },
          { text: `Buy ${toDisplay(item.buy!, unit)}` },
        ]
      : item.value !== undefined
        ? [
            {
              text: item.valueCurrency === "usd" ? formatUsd(item.value) : toDisplay(item.value, unit),
              tooltip: item.fa,
            },
          ]
        : [];

    return (
      <List.Item
        key={item.id}
        title={title}
        subtitle={subtitle}
        icon={getItemIcon(item)}
        keywords={keywords}
        accessories={accessories}
        actions={
          <ActionPanel>
            {isTwoPrice ? (
              <>
                <Action.CopyToClipboard
                  title="Copy Sell Price"
                  content={copyValue(unit === "rial" ? item.sell! * 10 : item.sell!)}
                />
                <Action.CopyToClipboard
                  title="Copy Buy Price"
                  content={copyValue(unit === "rial" ? item.buy! * 10 : item.buy!)}
                />
              </>
            ) : item.value !== undefined ? (
              <Action.CopyToClipboard
                title="Copy Price"
                content={copyValue(
                  item.valueCurrency === "usd" ? item.value : unit === "rial" ? item.value * 10 : item.value,
                )}
              />
            ) : null}
            <Action
              title={isPinned ? "Unpin" : "Pin"}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => togglePin(item.id)}
            />
            <Action.OpenInBrowser url="https://www.bonbast.com" />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by name, code or Persian name">
      {pinnedItems.length > 0 && (
        <List.Section title="Pinned" subtitle={firstSection === "pinned" ? updatedSubtitle : undefined}>
          {pinnedItems.map(renderItem)}
        </List.Section>
      )}
      {currencyItems.length > 0 && (
        <List.Section title="Currencies" subtitle={firstSection === "currencies" ? updatedSubtitle : undefined}>
          {currencyItems.map(renderItem)}
        </List.Section>
      )}
      {coinItems.length > 0 && (
        <List.Section title="Gold Coins" subtitle={firstSection === "coins" ? updatedSubtitle : undefined}>
          {coinItems.map(renderItem)}
        </List.Section>
      )}
      {marketItems.length > 0 && (
        <List.Section title="Gold and Markets" subtitle={firstSection === "markets" ? updatedSubtitle : undefined}>
          {marketItems.map(renderItem)}
        </List.Section>
      )}
    </List>
  );
}
