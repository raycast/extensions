import { Clipboard, List, Toast, showHUD, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Account, AccountType, Jar } from "./types";
import { useLocalStorage, useCurrencyRates, useClientInfo } from "./hooks";

import AccountDetail from "./components/accounts/AccountDetail";
import AccountActions from "./components/accounts/AccountActions";
import JarDetail from "./components/accounts/JarDetail";
import JarActions from "./components/accounts/JarActions";

import {
  formatCurrency,
  filterOutPinnedItems,
  isAccount,
  satisfiesTexts,
  calculateTotal,
  getAccountAccessories,
  getJarAccessories,
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
  [Category.FOP]: "PEs",
  [Category.JAR]: "Jars",
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState<Category>(Category.ALL);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { data: clientInfo, updateAccount, isLoading: isClientInfoLoading, isError: isAccountsError } = useClientInfo();
  const { data: rates, isLoading: isRatesLoading, isError: isRatesError } = useCurrencyRates();
  const {
    data: pinned,
    setData: setPinned,
    isLoading: isPinnedLoadingFromLS,
  } = useLocalStorage<string[]>("pinnedAccounts", []);
  const { accounts, jars } = clientInfo;

  useEffect(() => {
    if (isAccountsError || isRatesError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: isAccountsError ? "Failed to load accounts" : "Failed to load currency rates",
      });
    }
  }, [isAccountsError, isRatesError]);

  function onCategoryChange(newValue: Category) {
    setCategory(newValue);
  }

  async function onPin(item: Account | Jar) {
    const isPinned = pinned.some((pinnedAccount) => pinnedAccount === item.id);
    if (isPinned) {
      setPinned(pinned.filter((pinnedAccount) => pinnedAccount !== item.id));
      await showToast(Toast.Style.Success, `Unpinned ${getTitle(item)}`);
    } else {
      setPinned([...pinned, item.id]);
      await showToast(Toast.Style.Success, `Pinned ${getTitle(item)}`);
    }
  }

  async function onRearrange(item: Account | Jar, direction: "up" | "down") {
    const accountIndex = pinned.findIndex((pinnedAccount) => pinnedAccount === item.id);
    const newPinned = [...pinned];

    if (direction === "up") {
      newPinned[accountIndex] = newPinned[accountIndex - 1];
      newPinned[accountIndex - 1] = item.id;
      await showToast(Toast.Style.Success, `Moved up ${getTitle(item)}`);
    } else {
      newPinned[accountIndex] = newPinned[accountIndex + 1];
      newPinned[accountIndex + 1] = item.id;
      await showToast(Toast.Style.Success, `Moved down ${getTitle(item)}`);
    }

    setPinned(newPinned);
  }

  function toggleDetails() {
    setIsShowingDetail((isShowingDetail) => !isShowingDetail);
  }

  async function onCopyTotal() {
    await Clipboard.copy(totalAmount.toFixed(2));
    await showHUD("Copied to Clipboard");
  }

  function getValidRearrangeDirections(item: Account | Jar) {
    return {
      up: pinned.findIndex((pinnedAccount) => pinnedAccount === item.id) > 0,
      down: pinned.findIndex((pinnedAccount) => pinnedAccount === item.id) < pinned.length - 1,
    };
  }

  const cards = accounts.filter((account) => account.type !== AccountType.FOP);
  const fops = accounts.filter((account) => account.type === AccountType.FOP);

  const pinnedAccounts = pinned
    .map((pinnedAccountId) => [...accounts, ...jars].find((account) => account.id === pinnedAccountId))
    .filter((account) => {
      if (!account) return false;

      if (isAccount(account)) {
        return satisfiesTexts(
          searchText,
          account.title,
          account.currency.code,
          account.type,
          account.maskedPan.length ? account.maskedPan[0] : account.iban
        );
      }

      return satisfiesTexts(searchText, account.currency.code, account.title);
    }) as (Account | Jar)[];

  const filteredCards = filterOutPinnedItems({ category, items: cards, pinned }).filter((card) =>
    satisfiesTexts(searchText, card.title, card.currency.code, card.type, card.maskedPan[0])
  );

  const filteredFops = filterOutPinnedItems({ category, items: fops, pinned }).filter((fop) =>
    satisfiesTexts(searchText, fop.title, fop.currency.code, fop.type, fop.iban)
  );

  const filteredJars = filterOutPinnedItems({ category, items: jars, pinned }).filter((jar) =>
    satisfiesTexts(searchText, jar.title, jar.currency.code)
  );

  const totalAmount = calculateTotal([...cards, ...fops, ...jars], rates);
  const commandTitle = "Show Accounts"; // title for "accounts" in package.json
  const navigationTitle = `${commandTitle} (Total: ${formatCurrency(totalAmount, "UAH")})`;

  const isLoading = isClientInfoLoading || isRatesLoading || isPinnedLoadingFromLS;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      navigationTitle={!isRatesError ? navigationTitle : undefined}
      searchBarAccessory={<CategoryDropdown onCategoryChange={onCategoryChange} />}
      onSearchTextChange={setSearchText}
    >
      <List.Section title={categoryLabel[Category.PINNED]}>
        {[Category.ALL, Category.PINNED].includes(category) &&
          pinnedAccounts.map((account) => (
            <List.Item
              key={account.id}
              id={account.id}
              title={getTitle(account)}
              subtitle={getSubtitle(account)}
              detail={
                isShowingDetail ? (
                  isAccount(account) ? (
                    <AccountDetail account={account} />
                  ) : (
                    <JarDetail jar={account} />
                  )
                ) : null
              }
              accessories={
                !isShowingDetail
                  ? isAccount(account)
                    ? getAccountAccessories(account)
                    : getJarAccessories(account)
                  : null
              }
              actions={
                isAccount(account) ? (
                  <AccountActions
                    account={account}
                    isPinned={true}
                    validRearrangeDirections={getValidRearrangeDirections(account)}
                    onPin={onPin}
                    onRearrange={onRearrange}
                    onToggleDetails={toggleDetails}
                    onCopyTotal={onCopyTotal}
                    onEdit={updateAccount}
                  />
                ) : (
                  <JarActions
                    jar={account}
                    isPinned={true}
                    validRearrangeDirections={getValidRearrangeDirections(account)}
                    onPin={onPin}
                    onRearrange={onRearrange}
                    onToggleDetails={toggleDetails}
                    onCopyTotal={onCopyTotal}
                  />
                )
              }
            />
          ))}
      </List.Section>

      <List.Section title={categoryLabel[Category.CARD]}>
        {[Category.ALL, Category.CARD].includes(category) &&
          filteredCards.map((card) => (
            <List.Item
              key={card.id}
              id={card.id}
              title={getTitle(card)}
              subtitle={getSubtitle(card)}
              detail={<AccountDetail account={card} />}
              accessories={!isShowingDetail ? getAccountAccessories(card) : null}
              actions={
                <AccountActions
                  account={card}
                  isPinned={false}
                  onPin={onPin}
                  onToggleDetails={toggleDetails}
                  onCopyTotal={onCopyTotal}
                  onEdit={updateAccount}
                />
              }
            />
          ))}
      </List.Section>

      <List.Section title={categoryLabel[Category.FOP]}>
        {[Category.ALL, Category.FOP].includes(category) &&
          filteredFops.map((fop) => (
            <List.Item
              key={fop.id}
              id={fop.id}
              title={getTitle(fop)}
              subtitle={getSubtitle(fop)}
              detail={<AccountDetail account={fop} />}
              accessories={!isShowingDetail ? getAccountAccessories(fop) : null}
              actions={
                <AccountActions
                  account={fop}
                  isPinned={false}
                  onPin={onPin}
                  onToggleDetails={toggleDetails}
                  onCopyTotal={onCopyTotal}
                  onEdit={updateAccount}
                />
              }
            />
          ))}
      </List.Section>

      <List.Section title={categoryLabel[Category.JAR]}>
        {[Category.ALL, Category.JAR].includes(category) &&
          filteredJars.map((jar) => (
            <List.Item
              key={jar.id}
              id={jar.id}
              title={getTitle(jar)}
              subtitle={getSubtitle(jar)}
              detail={<JarDetail jar={jar} />}
              accessories={!isShowingDetail ? getJarAccessories(jar) : null}
              actions={
                <JarActions
                  jar={jar}
                  isPinned={false}
                  onPin={onPin}
                  onToggleDetails={toggleDetails}
                  onCopyTotal={onCopyTotal}
                />
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

function CategoryDropdown(props: { onCategoryChange: (newValue: Category) => void }) {
  const { onCategoryChange } = props;

  const commonCategories = Object.values(Category).filter((category) =>
    [Category.ALL, Category.PINNED].includes(category)
  );
  const otherCategories = Object.values(Category).filter((category) => !commonCategories.includes(category));

  return (
    <List.Dropdown tooltip="Select Category" storeValue onChange={(newValue) => onCategoryChange(newValue as Category)}>
      <List.Dropdown.Section>{renderCategoryDropdownItems(commonCategories)}</List.Dropdown.Section>
      <List.Dropdown.Section>{renderCategoryDropdownItems(otherCategories)}</List.Dropdown.Section>
    </List.Dropdown>
  );
}

function renderCategoryDropdownItems(categories: Category[]) {
  return categories.map((category) => (
    <List.Dropdown.Item key={category} title={categoryLabel[category]} value={category} />
  ));
}

function getTitle(item: Account | Jar) {
  if (isAccount(item)) {
    const panOrIban = item.maskedPan.length ? item.maskedPan[0] : item.iban;
    return `${item.currency.flag} ${item.title || panOrIban}`;
  }

  return `${item.currency.flag} ${item.title}`;
}

function getSubtitle(item: Account | Jar) {
  return formatCurrency(item.balance, item.currency.code);
}
