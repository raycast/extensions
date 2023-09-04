import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Currency, CurrencyRate } from "./types";
import { useLocalStorage, useCurrencyRates } from "./hooks";

import RateActions from "./components/rates/RateActions";

import { filterOutPinnedItems, transformRate } from "./utils";

enum Category {
  ALL = "all",
  PINNED = "pinned",
}

const categoryLabel: Record<Category, string> = {
  [Category.ALL]: "All",
  [Category.PINNED]: "Pinned",
};

export default function Command() {
  const [category, setCategory] = useState<Category>(Category.ALL);
  const { data, isLoading: isRatesLoading, isError } = useCurrencyRates();
  const {
    data: pinned,
    setData: setPinned,
    isLoading: isPinnedLoadingFromLS,
  } = useLocalStorage<string[]>("pinnedRates", []);

  useEffect(() => {
    if (isError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: "Failed to load currency rates",
      });
    }
  }, [isError]);

  function onCategoryChange(newValue: string) {
    setCategory(newValue as Category);
  }

  async function onPin(rate: CurrencyRate) {
    const isPinned = pinned.some((pinnedRate) => pinnedRate === rate.id);
    if (isPinned) {
      setPinned(pinned.filter((pinnedRate) => pinnedRate !== rate.id));
      await showToast(Toast.Style.Success, `Unpinned ${getTitle(rate.currencyA, rate.currencyB)}`);
    } else {
      setPinned([...pinned, rate.id]);
      await showToast(Toast.Style.Success, `Pinned ${getTitle(rate.currencyA, rate.currencyB)}`);
    }
  }

  async function onRearrange(rate: CurrencyRate, direction: "up" | "down") {
    const rateIndex = pinned.findIndex((pinnedRate) => pinnedRate === rate.id);
    const newPinned = [...pinned];

    if (direction === "up") {
      newPinned[rateIndex] = newPinned[rateIndex - 1];
      newPinned[rateIndex - 1] = rate.id;
      await showToast(Toast.Style.Success, `Moved up ${getTitle(rate.currencyA, rate.currencyB)}`);
    } else {
      newPinned[rateIndex] = newPinned[rateIndex + 1];
      newPinned[rateIndex + 1] = rate.id;
      await showToast(Toast.Style.Success, `Moved down ${getTitle(rate.currencyA, rate.currencyB)}`);
    }

    setPinned(newPinned);
  }

  function getValidRearrangeDirections(rate: CurrencyRate) {
    return {
      up: pinned.findIndex((pinnedRate) => pinnedRate === rate.id) > 0,
      down: pinned.findIndex((pinnedRate) => pinnedRate === rate.id) < pinned.length - 1,
    };
  }

  const transformedRates = data.map(transformRate);
  const pinnedRates = pinned
    .map((pinnedRate) => transformedRates.find((rate) => rate.id === pinnedRate))
    .filter(Boolean) as CurrencyRate[];
  const filteredRates = filterOutPinnedItems({ category, items: transformedRates, pinned });
  const isLoading = isRatesLoading || isPinnedLoadingFromLS;

  return (
    <List isLoading={isLoading} searchBarAccessory={<CategoryDropdown onCategoryChange={onCategoryChange} />}>
      <List.Section title={categoryLabel[Category.PINNED]}>
        {[Category.ALL, Category.PINNED].includes(category) &&
          pinnedRates.map((item) => (
            <List.Item
              key={item.id}
              id={item.id}
              title={getTitle(item.currencyA, item.currencyB)}
              subtitle={getSubtitle(item)}
              accessories={getAccessories(item)}
              actions={
                <RateActions
                  item={item}
                  isPinned={true}
                  onRearrange={onRearrange}
                  validRearrangeDirections={getValidRearrangeDirections(item)}
                  onPin={onPin}
                />
              }
            />
          ))}
      </List.Section>

      <List.Section title={categoryLabel[Category.ALL]}>
        {category === Category.ALL &&
          filteredRates.map((item) => (
            <List.Item
              key={item.id}
              id={item.id}
              title={getTitle(item.currencyA, item.currencyB)}
              subtitle={getSubtitle(item)}
              accessories={getAccessories(item)}
              actions={<RateActions item={item} isPinned={false} onPin={onPin} />}
            />
          ))}
      </List.Section>
    </List>
  );
}

function CategoryDropdown(props: { onCategoryChange: (newValue: string) => void }) {
  const { onCategoryChange } = props;
  const categories = Object.values(Category);

  return (
    <List.Dropdown tooltip="Select Category" storeValue onChange={(newValue) => onCategoryChange(newValue)}>
      {categories.map((category) => (
        <List.Dropdown.Item key={category} title={categoryLabel[category]} value={category} />
      ))}
    </List.Dropdown>
  );
}

function getTitle(currencyA: Currency, currencyB: Currency) {
  return `${currencyA.flag} ${currencyA.code} – ${currencyB.flag} ${currencyB.code}`;
}

function getSubtitle(rate: CurrencyRate) {
  return `${rate.rateCross || `${rate.rateBuy} / ${rate.rateSell}`}`;
}

function getAccessories(rate: CurrencyRate): List.Item.Accessory[] {
  return [{ text: `${rate.currencyA.name} – ${rate.currencyB.name}` }];
}
