import { Clipboard, List, Toast, showHUD, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { AccountOrJar, AccountType } from "./types";
import { useClientInfo, useCurrencyRates, usePinned } from "./hooks";
import { STORAGE_KEYS } from "./data/constants";
import CategoryDropdown from "./components/CategoryDropdown";
import TokenErrorEmptyView, { showInvalidTokenToast } from "./components/TokenErrorEmptyView";
import { PinProps } from "./components/PinActionsSection";
import AccountListItem from "./components/accounts/AccountListItem";
import JarListItem from "./components/accounts/JarListItem";
import {
  calculateTotal,
  compareJarsByGoal,
  filterOutPinnedItems,
  formatCurrency,
  getItemTitle,
  isAccount,
  matchesSearch,
} from "./utils";

enum Category {
  ALL = "all",
  PINNED = "pinned",
  CARD = "card",
  FOP = "fop",
  JAR = "jar",
}

const categoryLabel: Record<Category, string> = {
  [Category.ALL]: "All",
  [Category.PINNED]: "Pinned",
  [Category.CARD]: "Cards",
  [Category.FOP]: "FOP Accounts",
  [Category.JAR]: "Jars",
};

const categorySections = [
  [Category.ALL, Category.PINNED],
  [Category.CARD, Category.FOP, Category.JAR],
].map((section) => section.map((value) => ({ value, title: categoryLabel[value] })));

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState<Category>(Category.ALL);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const {
    data: clientInfo,
    updateAccount,
    isLoading: isClientInfoLoading,
    isError: isAccountsError,
    tokenError,
  } = useClientInfo();
  const { data: rates, isLoading: isRatesLoading, isError: isRatesError } = useCurrencyRates();
  const pinned = usePinned<AccountOrJar>(STORAGE_KEYS.pinnedAccounts, getItemTitle);
  const { accounts, jars } = clientInfo;

  useEffect(() => {
    // A missing token isn't an error: the empty view explains what to do.
    if (tokenError === "missing") return;

    if (tokenError === "invalid") {
      showInvalidTokenToast();
    } else if (isAccountsError || isRatesError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: isAccountsError ? "Failed to load accounts" : "Failed to load currency rates",
      });
    }
  }, [tokenError, isAccountsError, isRatesError]);

  const cards = accounts.filter((account) => account.type !== AccountType.FOP);
  const fops = accounts.filter((account) => account.type === AccountType.FOP);
  const sortedJars = [...jars].sort(compareJarsByGoal);
  const allItems: AccountOrJar[] = [...cards, ...fops, ...sortedJars];

  const pinnedItems = pinned.pinnedIds
    .map((id) => allItems.find((item) => item.id === id))
    .filter((item): item is AccountOrJar => !!item && matchesSearch(item, searchText));

  function getUnpinnedItems<T extends AccountOrJar>(items: T[]) {
    return filterOutPinnedItems({ category, items, pinned: pinned.pinnedIds }).filter((item) =>
      matchesSearch(item, searchText),
    );
  }

  const totalAmount = calculateTotal(allItems, rates);
  const commandTitle = "Show Accounts"; // title for "accounts" in package.json
  const navigationTitle = `${commandTitle} (Total: ${formatCurrency(totalAmount, "UAH")})`;

  function isCategoryVisible(sectionCategory: Category) {
    return category === Category.ALL || category === sectionCategory;
  }

  function toggleDetails() {
    setIsShowingDetail((isShowingDetail) => !isShowingDetail);
  }

  async function onCopyTotal() {
    await Clipboard.copy(totalAmount.toFixed(2));
    await showHUD("Copied to Clipboard");
  }

  function getPinProps(item: AccountOrJar, isInPinnedSection: boolean): PinProps {
    const onTogglePin = () => pinned.togglePin(item);
    if (!isInPinnedSection) return { isPinned: false, onTogglePin };

    return {
      isPinned: true,
      onTogglePin,
      moveDirections: pinned.getMoveDirections(item),
      onMove: (direction) => pinned.move(item, direction),
    };
  }

  function renderItem(item: AccountOrJar, isInPinnedSection = false) {
    const commonProps = {
      isShowingDetail,
      pin: getPinProps(item, isInPinnedSection),
      onToggleDetails: toggleDetails,
      onCopyTotal,
    };

    return isAccount(item) ? (
      <AccountListItem
        key={item.id}
        account={item}
        ownerName={clientInfo.name}
        onEdit={updateAccount}
        {...commonProps}
      />
    ) : (
      <JarListItem key={item.id} jar={item} {...commonProps} />
    );
  }

  return (
    <List
      isLoading={isClientInfoLoading || isRatesLoading || pinned.isLoading}
      isShowingDetail={isShowingDetail}
      navigationTitle={!isRatesError ? navigationTitle : undefined}
      searchBarAccessory={<CategoryDropdown sections={categorySections} onChange={setCategory} />}
      onSearchTextChange={setSearchText}
    >
      {tokenError && <TokenErrorEmptyView tokenError={tokenError} purpose="see your accounts" />}
      <List.Section title={categoryLabel[Category.PINNED]}>
        {isCategoryVisible(Category.PINNED) && pinnedItems.map((item) => renderItem(item, true))}
      </List.Section>
      <List.Section title={categoryLabel[Category.CARD]}>
        {isCategoryVisible(Category.CARD) && getUnpinnedItems(cards).map((item) => renderItem(item))}
      </List.Section>
      <List.Section title={categoryLabel[Category.FOP]}>
        {isCategoryVisible(Category.FOP) && getUnpinnedItems(fops).map((item) => renderItem(item))}
      </List.Section>
      <List.Section title={categoryLabel[Category.JAR]}>
        {isCategoryVisible(Category.JAR) && getUnpinnedItems(sortedJars).map((item) => renderItem(item))}
      </List.Section>
    </List>
  );
}
