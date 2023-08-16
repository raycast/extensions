import { Action, ActionPanel, Clipboard, Color, Icon, List, Toast, showHUD, showToast } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useAccounts } from "./hooks/useAccounts";
import { Account, Jar } from "./types";
import { isAccount } from "./utils/typeGuards";
import { accountTypeColors } from "./data/constants";
import { useCurrencyRates } from "./hooks/useCurrencyRates";
import { useEffect, useState } from "react";
import { calculateTotal, satisfiesTexts, filterPinnedItems, formatCurrency } from "./utils";
import { useLocalStorage } from "./hooks/useLocalStorage";
import EditForm from "./views/EditForm";

type Category = "all" | "pinned" | "card" | "fop" | "jar";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { data: clientInfo, isLoading: isClientInfoLoading, isError: isAccountsError } = useAccounts();
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

  const filteredCards = filterPinnedItems({ category, items: cards, pinned }).filter((card) =>
    satisfiesTexts(searchText, card.title, card.currency.code, card.type, card.maskedPan[0])
  );

  const filteredFops = filterPinnedItems({ category, items: fops, pinned }).filter((fop) =>
    satisfiesTexts(searchText, fop.title, fop.currency.code, fop.type, fop.iban)
  );

  const filteredJars = filterPinnedItems({ category, items: jars, pinned }).filter((jar) =>
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
      {(category === "all" || category === "pinned") && (
        <List.Section title="Pinned">
          {pinnedAccounts.map((account) => (
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
      )}

      {(category === "all" || category === "card") && (
        <List.Section title="Cards">
          {filteredCards.map((card) => (
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
                />
              }
            />
          ))}
        </List.Section>
      )}

      {(category === "all" || category === "fop") && (
        <List.Section title="PEs">
          {filteredFops.map((fop) => (
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
                />
              }
            />
          ))}
        </List.Section>
      )}

      {(category === "all" || category === "jar") && (
        <List.Section title="Jars">
          {filteredJars.map((jar) => (
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
      )}
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
    return `${item.currency.flag} ${item.title ? item.title : panOrIban}`;
  }

  return item.currency.flag + " " + item.title;
}

function getSubtitle(item: Account | Jar) {
  return formatCurrency(item.balance, item.currency.code);
}

function getAccountAccessories(account: Account): List.Item.Accessory[] {
  const color = accountTypeColors[account.type];

  const panOrIban = account.type === "fop" ? account.iban : account.maskedPan[0];

  return account.title
    ? [{ text: panOrIban }, { tag: { value: account.type, color } }]
    : [{ tag: { value: account.type, color } }];
}

function AccountDetail(props: { account: Account }) {
  const { account } = props;

  const hasTopUpPage = account.sendId && account.currency.code === "UAH";

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="ID" text={account.id} />
          <List.Item.Detail.Metadata.Separator />

          {account.maskedPan.length ? (
            <>
              <List.Item.Detail.Metadata.Label title="Masked Pan" text={account.maskedPan[0]} />
              <List.Item.Detail.Metadata.Separator />
            </>
          ) : undefined}

          <List.Item.Detail.Metadata.Label title="IBAN" text={account.iban} />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.TagList title="Type">
            <List.Item.Detail.Metadata.TagList.Item text={account.type} color={accountTypeColors[account.type]} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Currency"
            text={account.currency.flag + " " + account.currency.code + ", " + account.currency.name}
          />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Balance"
            text={formatCurrency(account.balance, account.currency.code)}
          />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Credit Limit"
            text={formatCurrency(account.creditLimit, account.currency.code)}
          />
          <List.Item.Detail.Metadata.Separator />

          {account.cashbackType ? (
            <>
              <List.Item.Detail.Metadata.Label title="Cashback Type" text={account.cashbackType} />
              <List.Item.Detail.Metadata.Separator />
            </>
          ) : undefined}

          {hasTopUpPage ? (
            <List.Item.Detail.Metadata.Link
              title="Top Up Page URL"
              text={`https://send.monobank.ua/${account.sendId}`}
              target={`https://send.monobank.ua/${account.sendId}`}
            />
          ) : undefined}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function AccountActions(props: {
  account: Account;
  isPinned: boolean;
  validRearrangeDirections?: { up: boolean; down: boolean };
  onPin: (account: Account) => void;
  onRearrange?: (account: Account, direction: "up" | "down") => void;
  onToggleDetails: () => void;
  onCopyTotal: () => void;
}) {
  const { account, isPinned, validRearrangeDirections, onPin, onRearrange, onToggleDetails, onCopyTotal } = props;

  const sendUrl = `https://send.monobank.ua/${account.sendId}`;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {account.sendId && account.currency.code === "UAH" && (
          <>
            <Action.OpenInBrowser title="Open Top Up Page" url={sendUrl} />
            <Action.CopyToClipboard title="Copy Top Up Page URL" icon={Icon.Link} content={sendUrl} />
          </>
        )}
        <Action.CopyToClipboard
          title="Copy IBAN"
          content={account.iban}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />
        <Action.CopyToClipboard
          title="Copy Balance"
          content={account.balance}
          shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
        />
        <Action
          title="Copy Total"
          icon={Icon.CopyClipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          onAction={onCopyTotal}
        />
        <Action.Push
          title="Edit Account"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={<EditForm account={account} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={onToggleDetails}
        />
        <Action
          title={!isPinned ? "Pin" : "Unpin"}
          icon={!isPinned ? Icon.Pin : Icon.PinDisabled}
          shortcut={{ key: "p", modifiers: ["cmd", "shift"] }}
          onAction={() => onPin(account)}
        />
        {isPinned && onRearrange && (
          <>
            {validRearrangeDirections?.up && (
              <Action
                title="Move Up in Pinned"
                icon={Icon.ArrowUp}
                shortcut={{ key: "arrowUp", modifiers: ["cmd", "opt"] }}
                onAction={() => onRearrange(account, "up")}
              />
            )}

            {validRearrangeDirections?.down && (
              <Action
                title="Move Down in Pinned"
                icon={Icon.ArrowDown}
                shortcut={{ key: "arrowDown", modifiers: ["cmd", "opt"] }}
                onAction={() => onRearrange(account, "down")}
              />
            )}
          </>
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function getJarAccessories(jar: Jar): List.Item.Accessory[] {
  const progress = jar.balance / jar.goal;
  const percentage = (progress * 100).toFixed(2);

  if (!jar.goal) return [{ text: "No goal" }];

  return [
    {
      text: formatCurrency(jar.goal, jar.currency.code),
    },
    {
      icon:
        progress < 1 ? getProgressIcon(progress, Color.Green) : { source: Icon.CheckCircle, tintColor: Color.Green },
      tooltip: `${percentage}%`,
    },
  ];
}

function JarDetail(props: { jar: Jar }) {
  const { jar } = props;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="ID" text={jar.id} />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Title" text={jar.title} />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Description" text={jar.description} />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Currency"
            text={jar.currency.flag + " " + jar.currency.code + ", " + jar.currency.name}
          />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Balance" text={formatCurrency(jar.balance, jar.currency.code)} />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Goal"
            text={jar.goal ? formatCurrency(jar.goal, jar.currency.code) : "No goal"}
          />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Link
            title="Top Up Page URL"
            text={`https://send.monobank.ua/${jar.sendId}`}
            target={`https://send.monobank.ua/${jar.sendId}`}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function JarActions(props: {
  jar: Jar;
  isPinned: boolean;
  validRearrangeDirections?: { up: boolean; down: boolean };
  onPin: (account: Jar) => void;
  onRearrange?: (account: Jar, direction: "up" | "down") => void;
  onToggleDetails: () => void;
  onCopyTotal: () => void;
}) {
  const { jar, isPinned, validRearrangeDirections, onPin, onRearrange, onToggleDetails, onCopyTotal } = props;

  const sendUrl = `https://send.monobank.ua/${jar.sendId}`;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open Top Up Page" url={sendUrl} />
        <Action.CopyToClipboard title="Copy Top Up Page URL" icon={Icon.Link} content={sendUrl} />
        <Action.CopyToClipboard
          title="Copy Balance"
          content={jar.balance}
          shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
        />
        {jar.goal ? (
          <Action.CopyToClipboard
            title="Copy Goal"
            content={jar.goal}
            shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
          />
        ) : undefined}
        <Action
          title="Copy Total"
          icon={Icon.CopyClipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          onAction={onCopyTotal}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={onToggleDetails}
        />
        <Action
          title={!isPinned ? "Pin" : "Unpin"}
          icon={!isPinned ? Icon.Pin : Icon.PinDisabled}
          shortcut={{ key: "p", modifiers: ["cmd", "shift"] }}
          onAction={() => onPin(jar)}
        />
        {isPinned && onRearrange && (
          <>
            {validRearrangeDirections?.up && (
              <Action
                title="Move Up in Pinned"
                icon={Icon.ArrowUp}
                shortcut={{ key: "arrowUp", modifiers: ["cmd", "opt"] }}
                onAction={() => onRearrange(jar, "up")}
              />
            )}

            {validRearrangeDirections?.down && (
              <Action
                title="Move Down in Pinned"
                icon={Icon.ArrowDown}
                shortcut={{ key: "arrowDown", modifiers: ["cmd", "opt"] }}
                onAction={() => onRearrange(jar, "down")}
              />
            )}
          </>
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
