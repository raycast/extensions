import { ActionPanel, List, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import useSWR from "swr";
import cheerio from "cheerio";

export default function Command() {
  const [query, setQuery] = useState("");
  const {
    data: result,
    error,
    isValidating,
  } = useSWR(
    () => (query ? `/ens-query/${query}` : null),
    () => performSearch(query),
  );

  useEffect(() => {
    if (error) {
      if (error instanceof AbortError) {
        return;
      }

      showToast(Toast.Style.Failure, "Could not perform search", String(error));
    }
  }, [error]);

  const showEnsResult = result?.found && result.ens;
  const showAddressResult = result?.found && result.address;

  return (
    <List
      isLoading={isValidating}
      onSearchTextChange={(value) => setQuery(value)}
      searchBarPlaceholder="Search by Ethereum name or address..."
      throttle
    >
      {showAddressResult && (
        <List.Section title={`Overview of ${query}`}>
          {<AddressListItems searchResult={result} searchText={query} />}
        </List.Section>
      )}

      {showAddressResult && result?.transactions && (
        <List.Section title="Transactions">
          {result.transactions.map((transaction) => (
            <TransactionListItem key={transaction.id} transaction={transaction} />
          ))}
        </List.Section>
      )}

      {showEnsResult && <List.Section title="ENS Overview">{<EnsListItems searchResult={result} />}</List.Section>}

      {showEnsResult && result.ownedEns && (
        <List.Section title="Owned Ethereum Names">
          {result.ownedEns.map((data) => (
            <EnsItem key={data.ens} ens={data.ens} expiration={data.expiration} />
          ))}
        </List.Section>
      )}

      {showEnsResult && result.forwardedEns && (
        <List.Section title="Forward Resolved Names">
          {result.forwardedEns.map((data) => (
            <EnsItem key={data} ens={data} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function EnsItem({ ens, expiration }: { ens: string; expiration?: string }) {
  return <List.Item title={ens} accessoryTitle={expiration} actions={<ENSActions ens={ens} />} />;
}

function EnsListItems({ searchResult }: { searchResult: SearchResult }) {
  return (
    <>
      <List.Item
        title="Reverse Record"
        accessoryTitle={searchResult.ens}
        actions={<ENSActions ens={searchResult.ens!} />}
      />
      <List.Item
        title="Registrant"
        accessoryTitle={searchResult.registrant}
        actions={<AddressActions address={searchResult.registrant!} />}
      />
    </>
  );
}

function AddressActions({ address }: { address: string }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="View on Etherscan" url={`https://etherscan.io/address/${address}`} />
        <Action.CopyToClipboard title="Copy Address" content={address} shortcut={{ modifiers: ["cmd"], key: "." }} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function ENSActions({ ens }: { ens: string }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="View on Etherscan" url={`https://etherscan.io/enslookup-search?search=${ens}`} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function AddressListItems({ searchResult, searchText }: { searchResult: SearchResult; searchText: string }) {
  return (
    <>
      <List.Item title="Ethereum Name" accessoryTitle={searchText} actions={<ENSActions ens={searchText} />} />
      <List.Item
        title="Address"
        accessoryTitle={searchResult.address!}
        actions={<AddressActions address={searchResult.address!} />}
      />
      <List.Item
        title="Controller"
        accessoryTitle={searchResult.controller!}
        actions={<AddressActions address={searchResult.controller!} />}
      />
      <List.Item
        title="Registrant"
        accessoryTitle={searchResult.registrant!}
        actions={<AddressActions address={searchResult.registrant!} />}
      />
      <List.Item title="Expiration Date" accessoryTitle={searchResult.expiration!} />
    </>
  );
}

function TransactionListItem({ transaction }: { transaction: Transaction }) {
  return (
    <List.Item
      title={transaction.id}
      subtitle={transaction.action}
      accessoryTitle={transaction.date}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="View on Etherscan" url={`https://etherscan.io/tx/${transaction.id}`} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function performSearch(searchText: string): Promise<SearchResult> {
  const params = new URLSearchParams();

  params.append("search", searchText);

  const response = await fetch(`https://etherscan.io/enslookup-search?${params.toString()}`);

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const ensResult = $("#ContentPlaceHolder1_ensNameResult");
  const addressResult = $("#ContentPlaceHolder1_addressResult");
  const errorNotFound = $("#ContentPlaceHolder1_errorContainer");

  if (errorNotFound.length > 0) {
    return {
      found: false,
    };
  }

  if (addressResult.length > 0) {
    const ens = addressResult.find(".card-body .row").first().find("a").text();
    const registrant = addressResult.find(".card-body .row").last().find("a").text();

    const ownedEnsTable = addressResult.find("#ownedEthNamesTable");
    let ownedEns: OwnedEthereumName[] = [];

    const forwardsTable = addressResult.find("#resolvedAddressTable");
    let forwardedEns: string[] = [];

    if (ownedEnsTable.length > 0) {
      ownedEns = ownedEnsTable
        .find("tbody tr")
        .map((i, el) => {
          const $el = $(el);
          const ens = $($el.find("td").get(0)).text();
          const expiration = $($el.find("td").get(1)).find("span").text();

          return {
            ens,
            expiration,
          };
        })
        .get();
    }

    if (forwardsTable.length > 0) {
      forwardedEns = forwardsTable
        .find("tbody tr")
        .map((i, el) => {
          const $el = $(el);
          const name = $($el.find("td").get(0)).text();

          return name;
        })
        .get();
    }

    return {
      found: true,
      ens,
      registrant,
      ownedEns,
      forwardedEns,
    };
  }

  if (ensResult.length > 0) {
    const address = ensResult.find("#ContentPlaceHolder1_divResolvedAddress #txtEthereumAddress").first().text();

    const nameCard = ensResult.find(".card").first();

    const controller = nameCard.find("#ensControllerId").first().text();
    const registrant = nameCard.find("#ensRegistrantId").first().text();
    const expiration = $(nameCard.find(".row").get(1)).find(".col-md-9").text();
    const tokenId = $(nameCard.find(".row").get(3)).find(".col-md-9").text();

    const transactionCard = ensResult.find(".card").last();

    const transactions: Transaction[] = transactionCard
      .find("table tbody tr")
      .map((i, el) => {
        const transactionRow = $(el);

        return {
          id: transactionRow.find("td").first().text(),
          date: $(transactionRow.find("td").get(1)).text(),
          from: $(transactionRow.find("td").get(2)).text(),
          action: $(transactionRow.find("td").get(3)).text(),
        } as Transaction;
      })
      .get();

    return {
      found: true,
      address,
      controller,
      registrant,
      expiration,
      tokenId,
      transactions,
    };
  }

  return {
    found: false,
  };
}

interface SearchState {
  result: SearchResult | null;
  isLoading: boolean;
  searchText: string;
}

interface Transaction {
  id: string;
  date: string;
  from: string;
  action: string;
}

interface OwnedEthereumName {
  ens: string;
  expiration: string;
}

interface SearchResult {
  found: boolean;
  ens?: string;
  address?: string;

  controller?: string;
  registrant?: string;
  tokenId?: string;

  expiration?: string;

  transactions?: Transaction[];

  ownedEns?: OwnedEthereumName[];

  forwardedEns?: string[];
}
