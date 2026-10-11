import { Action, ActionPanel, Icon, Image, Keyboard, LaunchProps, List, getPreferenceValues } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { RateItem, fetchRates, findItem } from "./lib/bonbast";
import { Unit, copyValue, parseAmount, toDisplay, unitLabel } from "./lib/format";

function getItemIcon(item: RateItem): Image.ImageLike {
  if (item.kind === "currency") {
    return item.flag ?? Icon.BankNote;
  }
  return Icon.Coins;
}

export default function ConvertCommand(props: LaunchProps<{ arguments: { amount: string; code?: string } }>) {
  const { unit = "toman" } = getPreferenceValues<{ unit?: Unit }>();
  const { isLoading, data, error, revalidate } = useCachedPromise(fetchRates, [], {
    keepPreviousData: true,
    onError: (err) => {
      showFailureToast(err, { title: "Could not load rates from bonbast.com" });
    },
  });

  const parsedAmount = parseAmount(props.arguments.amount);
  if (parsedAmount === undefined) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Enter a positive number"
          description="Please provide a valid positive amount to convert."
        />
      </List>
    );
  }

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

  if (!data) {
    return <List isLoading={isLoading} />;
  }

  const rawCode = props.arguments.code?.trim();

  if (rawCode) {
    const convertibleItems = data.items.filter((item) => item.kind === "currency" || item.kind === "coin");
    const item = findItem(convertibleItems, rawCode);

    if (!item || item.sell === undefined || item.buy === undefined) {
      return (
        <List isLoading={isLoading}>
          <List.EmptyView
            icon={Icon.QuestionMark}
            title={`Unknown code: ${rawCode}`}
            description="Try USD, EUR, GBP, AED, TRY, or coin names like emami, azadi."
            actions={
              <ActionPanel>
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
        </List>
      );
    }

    const sellToman = (parsedAmount * item.sell) / item.unit;
    const buyToman = (parsedAmount * item.buy) / item.unit;
    const sellDisplay = toDisplay(sellToman, unit);
    const buyDisplay = toDisplay(buyToman, unit);
    const currentUnitLabel = unitLabel(unit);
    const codeStr = item.code ?? item.name;
    const amountStr = parsedAmount.toLocaleString("en-US");

    const sellValToCopy = copyValue(unit === "rial" ? sellToman * 10 : sellToman);
    const buyValToCopy = copyValue(unit === "rial" ? buyToman * 10 : buyToman);

    return (
      <List isLoading={isLoading}>
        <List.Item
          title={`${amountStr} ${codeStr} = ${sellDisplay} ${currentUnitLabel}`}
          subtitle="Sell"
          icon={getItemIcon(item)}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Result" content={sellValToCopy} />
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
        <List.Item
          title={`${amountStr} ${codeStr} = ${buyDisplay} ${currentUnitLabel}`}
          subtitle="Buy"
          icon={getItemIcon(item)}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Result" content={buyValToCopy} />
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
      </List>
    );
  }

  const amountToman = unit === "rial" ? parsedAmount / 10 : parsedAmount;
  const items = data.items;
  const currencyItems = items.filter((item) => item.kind === "currency" && item.sell !== undefined);
  const coinItems = items.filter((item) => item.kind === "coin" && item.sell !== undefined);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter currencies and coins">
      <List.Section title="Currencies">
        {currencyItems.map((item) => {
          const ratePerUnit = item.sell! / item.unit;
          const unitsBought = amountToman / ratePerUnit;
          const formattedCount = unitsBought.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const title = `${formattedCount} ${item.code}`;
          const copyStr = unitsBought.toFixed(2);
          const perUnitSellDisplay = `${toDisplay(ratePerUnit, unit)} ${unitLabel(unit)}`;
          const keywords = [item.id, item.code, item.fa].filter((k): k is string => Boolean(k));

          return (
            <List.Item
              key={item.id}
              title={title}
              subtitle={item.name}
              icon={getItemIcon(item)}
              keywords={keywords}
              accessories={[{ text: perUnitSellDisplay }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Result" content={copyStr} />
                  <Action.CopyToClipboard
                    title="Copy Per-Unit Sell Price"
                    content={copyValue(unit === "rial" ? ratePerUnit * 10 : ratePerUnit)}
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
        })}
      </List.Section>
      <List.Section title="Gold Coins">
        {coinItems.map((item) => {
          const ratePerUnit = item.sell! / item.unit;
          const countBought = amountToman / ratePerUnit;
          const formattedCount = countBought.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const title = formattedCount;
          const copyStr = countBought.toFixed(2);
          const perUnitSellDisplay = `${toDisplay(ratePerUnit, unit)} ${unitLabel(unit)}`;
          const keywords = [item.id, item.code, item.fa].filter((k): k is string => Boolean(k));

          return (
            <List.Item
              key={item.id}
              title={title}
              subtitle={item.name}
              icon={getItemIcon(item)}
              keywords={keywords}
              accessories={[{ text: perUnitSellDisplay }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Result" content={copyStr} />
                  <Action.CopyToClipboard
                    title="Copy Per-Unit Sell Price"
                    content={copyValue(unit === "rial" ? ratePerUnit * 10 : ratePerUnit)}
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
        })}
      </List.Section>
    </List>
  );
}
