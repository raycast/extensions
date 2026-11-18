import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { CurrencyRate } from "./types";
import { useCurrencyRates, usePinned } from "./hooks";
import { STORAGE_KEYS } from "./data/constants";
import CategoryDropdown from "./components/CategoryDropdown";
import RateListItem from "./components/rates/RateListItem";
import { filterOutPinnedItems, getRateTitle } from "./utils";

enum Category {
  ALL = "all",
  PINNED = "pinned",
}

const categoryLabel: Record<Category, string> = {
  [Category.ALL]: "All",
  [Category.PINNED]: "Pinned",
};

const categorySections = [[Category.ALL, Category.PINNED].map((value) => ({ value, title: categoryLabel[value] }))];

export default function Command() {
  const [category, setCategory] = useState<Category>(Category.ALL);
  const { data: rates, previous, isLoading: isRatesLoading, isError } = useCurrencyRates();
  const pinned = usePinned<CurrencyRate>(STORAGE_KEYS.pinnedRates, getRateTitle);

  useEffect(() => {
    if (isError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: "Failed to load currency rates",
      });
    }
  }, [isError]);

  const pinnedRates = pinned.pinnedIds
    .map((id) => rates.find((rate) => rate.id === id))
    .filter((rate): rate is CurrencyRate => !!rate);
  const otherRates = filterOutPinnedItems({ category, items: rates, pinned: pinned.pinnedIds });

  return (
    <List
      isLoading={isRatesLoading || pinned.isLoading}
      searchBarAccessory={<CategoryDropdown sections={categorySections} onChange={setCategory} />}
    >
      <List.Section title={categoryLabel[Category.PINNED]}>
        {[Category.ALL, Category.PINNED].includes(category) &&
          pinnedRates.map((rate) => (
            <RateListItem
              key={rate.id}
              rate={rate}
              previous={previous}
              pin={{
                isPinned: true,
                onTogglePin: () => pinned.togglePin(rate),
                moveDirections: pinned.getMoveDirections(rate),
                onMove: (direction) => pinned.move(rate, direction),
              }}
            />
          ))}
      </List.Section>

      <List.Section title={categoryLabel[Category.ALL]}>
        {category === Category.ALL &&
          otherRates.map((rate) => (
            <RateListItem
              key={rate.id}
              rate={rate}
              previous={previous}
              pin={{ isPinned: false, onTogglePin: () => pinned.togglePin(rate) }}
            />
          ))}
      </List.Section>
    </List>
  );
}
