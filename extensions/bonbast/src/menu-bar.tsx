import { Clipboard, MenuBarExtra, getPreferenceValues, open, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { RateItem, fetchRates } from "./lib/bonbast";
import { Unit, copyValue, formatUsd, toDisplay } from "./lib/format";

const MENU_ITEM_IDS = ["usd", "eur", "gbp", "aed", "try", "emami", "azadi", "gol18"];

function getShortName(item: RateItem): string {
  if (item.code) return item.code;
  if (item.id === "emami") return "Emami";
  if (item.id === "azadi") return "Azadi";
  if (item.id === "gol18") return "18k Gold";
  return item.name;
}

function formatRate(item: RateItem, unit: Unit): string {
  if (item.sell !== undefined) {
    return toDisplay(item.sell, unit);
  }
  if (item.value !== undefined) {
    return item.valueCurrency === "usd" ? formatUsd(item.value) : toDisplay(item.value, unit);
  }
  return "";
}

function getPlainValue(item: RateItem, unit: Unit): string {
  if (item.valueCurrency === "usd" && item.value !== undefined) {
    return copyValue(item.value);
  }
  const tomanVal = item.sell ?? item.value;
  if (tomanVal === undefined) return "";
  const val = unit === "rial" ? tomanVal * 10 : tomanVal;
  return copyValue(val);
}

export default function MenuBarCommand() {
  const { menuBarItem = "usd", unit = "toman" } = getPreferenceValues<{
    menuBarItem?: string;
    unit?: Unit;
  }>();

  const { isLoading, data, error } = useCachedPromise(fetchRates, [], {
    keepPreviousData: true,
  });

  if (error && !data) {
    return (
      <MenuBarExtra isLoading={isLoading} title="Bonbast">
        <MenuBarExtra.Item title="Could not load rates" />
      </MenuBarExtra>
    );
  }

  const currentItem = data?.items.find((item) => item.id === menuBarItem);
  const title = currentItem ? `${getShortName(currentItem)} ${formatRate(currentItem, unit)}` : undefined;
  const tooltip = currentItem ? `Bonbast: ${currentItem.name} sell rate` : undefined;

  const menuItems = MENU_ITEM_IDS.map((id) => data?.items.find((item) => item.id === id)).filter(
    (item): item is RateItem => item !== undefined,
  );

  return (
    <MenuBarExtra isLoading={isLoading} title={title} tooltip={tooltip}>
      <MenuBarExtra.Section>
        {menuItems.map((item) => (
          <MenuBarExtra.Item
            key={item.id}
            title={item.name}
            subtitle={formatRate(item, unit)}
            onAction={async () => {
              const plain = getPlainValue(item, unit);
              await Clipboard.copy(plain);
              await showHUD(`Copied ${item.name} rate (${plain})`);
            }}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {data?.updated && <MenuBarExtra.Item title={`Updated ${data.updated}`} />}
        <MenuBarExtra.Item
          title="Open bonbast.com"
          onAction={async () => {
            await open("https://www.bonbast.com");
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
