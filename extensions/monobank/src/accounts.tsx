import { Clipboard, List, Toast, showHUD, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Account, Jar } from "./types";
import { useLocalStorage, useCurrencyRates, useAccounts } from "./hooks";

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

type Category = "all" | "pinned" | "card" | "fop" | "jar";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { data: clientInfo, updateAccount, isLoading: isClientInfoLoading, isError: isAccountsError } = useAccounts();
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

  const cards = accounts.filter((account) => account.type !== "fop");
  const fops = accounts.filter((account) => account.type === "fop");

  const pinnedAccounts = pinned
    .map((pinnedAccountId) => [...accounts, ...jars].find((account) => account.id === pinnedAccountId)!)
    .filter((account) => {
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
    });

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

  const isLoading = isClientInfoLoading || isRatesLoading || isPinnedLoadingFromLS;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      navigationTitle={!isRatesError ? `Total: ${formatCurrency(totalAmount, "UAH")}` : undefined}
      searchBarAccessory={<CategoryDropdown onCategoryChange={onCategoryChange} />}
      onSearchTextChange={setSearchText}
    >
      <List.Section title="Pinned">
        {(category === "all" || category === "pinned") &&
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

      <List.Section title="Cards">
        {(category === "all" || category === "card") &&
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

      <List.Section title="PEs">
        {(category === "all" || category === "fop") &&
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

      <List.Section title="Jars">
        {(category === "all" || category === "jar") &&
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

  return (
    <List.Dropdown tooltip="Select Category" storeValue onChange={(newValue) => onCategoryChange(newValue as Category)}>
      <List.Dropdown.Section>
        <List.Dropdown.Item title="All" value="all" />
        <List.Dropdown.Item title="Pinned" value="pinned" />
      </List.Dropdown.Section>
      <List.Dropdown.Section>
        <List.Dropdown.Item title="Cards" value="card" />
        <List.Dropdown.Item title="PEs" value="fop" />
        <List.Dropdown.Item title="Jars" value="jar" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
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
