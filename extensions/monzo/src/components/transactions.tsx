import { useRef, FC } from "react";
import { List, Icon, Color, Image } from "@raycast/api";
import { usePromise, getAvatarIcon } from "@raycast/utils";
import { Monzo } from "@marceloclp/monzojs";

import { getTransactions } from "../lib/actions";
import {
  accountTitle,
  colourForCategory,
  formatCurrency,
  formatDate,
  formatSortCode,
  formatAddress,
  formatCategory,
} from "../lib/formatting";

type AccountProps = { account: Monzo.Accounts.Account };
type TransactionProps = {
  transaction: Monzo.Transactions.ExpandedTransaction<["merchant"]>;
};

export const TransactionsList: FC<AccountProps> = ({ account }) => {
  const abortable = useRef<AbortController>();
  const { isLoading, data: transactions } = usePromise(
    getTransactions,
    [account],
    { abortable }
  );
  return (
    <List
      navigationTitle={accountTitle(account)}
      enableFiltering
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search transactions"
    >
      {transactions?.map((transaction) => (
        <Transaction key={transaction.id} transaction={transaction} />
      ))}
    </List>
  );
};

const Transaction: FC<TransactionProps> = ({ transaction }) => {
  if (transaction.metadata["trigger"] == "coin_jar") {
    return null;
  }

  if (transaction.merchant) {
    return <MerchantTransaction transaction={transaction} />;
  }

  if (transaction.scheme == "uk_retail_pot") {
    return <PotTransaction transaction={transaction} />;
  }

  if (transaction.metadata["faster_payment"]) {
    return <FasterPaymentsTransaction transaction={transaction} />;
  }

  if (transaction.scheme == "p2p_payment") {
    return <P2PTransaction transaction={transaction} />;
  }

  return <UnknownTransaction transaction={transaction} />;
};

// Transaction types

const MerchantTransaction: FC<TransactionProps> = ({ transaction }) => {
  if (!transaction.merchant) {
    return null;
  }

  const icon: Image.ImageLike = transaction.merchant.logo
    ? { source: transaction.merchant.logo, mask: Image.Mask.Circle }
    : getAvatarIcon(transaction.merchant.name);

  const address = formatAddress(transaction.merchant.address);

  return (
    <List.Item
      title={transaction.merchant.name}
      keywords={[
        transaction.currency,
        transaction.category,
        transaction.merchant.address.address,
        transaction.merchant.address.city,
        transaction.merchant.address.country,
      ].filter(Boolean)}
      icon={icon}
      accessories={[getAccessory(transaction)]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <CommonTransactionDetail transaction={transaction} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Merchant"
                text={transaction.merchant.name}
              />
              {address && (
                <List.Item.Detail.Metadata.Label
                  title="Address"
                  text={address}
                />
              )}
              <List.Item.Detail.Metadata.Label
                title={transaction.merchant.emoji}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
};

const PotTransaction: FC<TransactionProps> = ({ transaction }) => {
  const category = transaction.category as string;

  let name = "Pot transfer";
  if (category === "savings") {
    name = "Savings";
  } else if (category === "transfers" && transaction.amount > 0) {
    name = "Pot withdrawal";
  }

  const isIFTTT = transaction.metadata["trigger"] == "ifttt";

  return (
    <List.Item
      title={name}
      keywords={[
        transaction.currency,
        isIFTTT ? "ifttt" : "",
        "pot",
        category,
      ].filter(Boolean)}
      icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
      accessories={[getAccessory(transaction)]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <CommonTransactionDetail transaction={transaction} />
              <List.Item.Detail.Metadata.Separator />
              {isIFTTT && (
                <List.Item.Detail.Metadata.Label
                  title="IFTTT"
                  icon={Icon.Wand}
                />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
};

const FasterPaymentsTransaction: FC<TransactionProps> = ({ transaction }) => {
  const counterparty = transaction.counterparty as FasterPaymentsCounterparty;
  return (
    <List.Item
      title={counterparty.name}
      keywords={[
        transaction.currency,
        counterparty.name,
        transaction.category,
      ].filter(Boolean)}
      icon={{
        source: Icon.ArrowNe,
        tintColor: transaction.amount < 0 ? Color.Yellow : Color.Green,
      }}
      accessories={[getAccessory(transaction)]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <CommonTransactionDetail transaction={transaction} />
              <List.Item.Detail.Metadata.Separator />
              <FasterPaymentsCounterpartyDetail counterparty={counterparty} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
};

const P2PTransaction: FC<TransactionProps> = ({ transaction }) => {
  const counterparty = transaction.counterparty as P2PCounterparty;
  const notes = transaction.metadata["notes"];
  const showNotes = notes && notes.length > 0 && notes.length < 10;
  const name = showNotes ? notes : counterparty.name;
  const reaction = transaction.metadata["reaction"];

  return (
    <List.Item
      title={name}
      keywords={[
        transaction.currency,
        transaction.category,
        counterparty.name,
        counterparty.preferred_name,
        notes,
        reaction,
      ].filter(Boolean)}
      icon={{
        source: Icon.TwoPeople,
        tintColor: transaction.amount < 0 ? Color.Yellow : Color.Green,
      }}
      accessories={[getAccessory(transaction)]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <CommonTransactionDetail transaction={transaction} />
              <List.Item.Detail.Metadata.Separator />
              {showNotes && (
                <List.Item.Detail.Metadata.Label title="Notes" text={notes} />
              )}
              {reaction && (
                <List.Item.Detail.Metadata.Label
                  title="Reaction"
                  text={reaction}
                />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
};

const UnknownTransaction: FC<TransactionProps> = ({ transaction }) => {
  const debugString = `
### Transaction could not be decoded.

Don't worry! This isn't a problem with your account, we just don't know how to display it in Raycast.

If you're comfortable sharing, please share the following with the Monzo for Raycast developers to help us improve the extension.

\`\`\`
${JSON.stringify(transaction, null, 2)}
\`\`\`
`;
  return (
    <List.Item
      title="Unknown"
      icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
      accessories={[getAccessory(transaction)]}
      detail={
        <List.Item.Detail
          markdown={debugString}
          metadata={<CommonTransactionDetail transaction={transaction} />}
        />
      }
    />
  );
};

// Shared views

const CommonTransactionDetail: FC<TransactionProps> = ({ transaction }) => {
  const dateCreated = formatDate(new Date(Date.parse(transaction.created)));
  const dateSettled = formatDate(new Date(Date.parse(transaction.created)));
  const showSettled = dateCreated != dateSettled;
  const showSettling = !transaction.settled;
  const wasRoundedUp = !!transaction.metadata["coin_jar_transaction"];
  const roundupAmount = Math.abs(
    Math.round(transaction.amount / 100) * 100 - transaction.amount
  );
  return (
    <>
      <List.Item.Detail.Metadata.Label
        title="Amount"
        text={formatCurrency(transaction.amount, transaction.currency)}
      />
      {transaction.currency != transaction.local_currency && (
        <List.Item.Detail.Metadata.Label
          title="Local amount"
          text={formatCurrency(
            transaction.local_amount,
            transaction.local_currency
          )}
        />
      )}
      {wasRoundedUp && (
        <List.Item.Detail.Metadata.Label
          title="Rounded up"
          text={formatCurrency(roundupAmount, transaction.currency)}
        />
      )}
      <List.Item.Detail.Metadata.Label title="Date" text={dateCreated} />
      {showSettled && (
        <List.Item.Detail.Metadata.Label title="Settled" text={dateSettled} />
      )}
      {showSettling && <List.Item.Detail.Metadata.Label title="Authorized" />}
      <List.Item.Detail.Metadata.TagList title="Category">
        <List.Item.Detail.Metadata.TagList.Item
          text={formatCategory(transaction.category)}
          color={colourForCategory(transaction.category)}
        />
      </List.Item.Detail.Metadata.TagList>
    </>
  );
};

const FasterPaymentsCounterpartyDetail: FC<{
  counterparty: FasterPaymentsCounterparty;
}> = ({ counterparty }) => {
  return (
    <>
      <List.Item.Detail.Metadata.Label title="Name" text={counterparty.name} />
      <List.Item.Detail.Metadata.Label
        title="Account number"
        text={counterparty.account_number}
      />
      <List.Item.Detail.Metadata.Label
        title="Sort code"
        text={formatSortCode(counterparty.sort_code)}
      />
    </>
  );
};

// Utils

function getAccessory(transaction: {
  amount: number;
  currency: string;
}): List.Item.Accessory {
  return {
    icon:
      transaction.amount > 0
        ? { source: Icon.Plus, tintColor: Color.Green }
        : null,
    text: formatCurrency(Math.abs(transaction.amount), transaction.currency),
  };
}

interface FasterPaymentsCounterparty {
  name: string;
  account_number: string;
  sort_code: string;
}

interface P2PCounterparty {
  name: string;
  preferred_name: string;
}
