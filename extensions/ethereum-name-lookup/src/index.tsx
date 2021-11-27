import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fetch, { AbortError } from "node-fetch";
import cheerio from "cheerio";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search by Ethereum name or address..."
      throttle
    >
      {state.result?.found && state.result.address && (
        <List.Section title={`Overview of ${state.searchText}`}>
          {<AddressListItems searchResult={state.result} searchText={state.searchText} />}
        </List.Section>
      )}

      {/* <List.Section title="Results">
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section> */}

      {state.result?.found && state.result?.transactions && (
        <List.Section title="Transactions">
          {state.result.transactions.map((transaction) => (
            <TransactionListItem key={transaction.id} transaction={transaction} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

/*
function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.}
      subtitle={searchResult.description}
      accessoryTitle={searchResult.username}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction title="Open in Browser" url={searchResult.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyToClipboardAction
              title="Copy Install Command"
              content={`npm install ${searchResult.name}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
*/

function AddressActions({ address }: { address: string }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <OpenInBrowserAction title="View on Etherscan" url={`https://etherscan.io/address/${address}`} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <CopyToClipboardAction title="Copy Address" content={address} shortcut={{ modifiers: ["cmd"], key: "." }} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function AddressListItems({ searchResult, searchText }: { searchResult: SearchResult; searchText: string }) {
  return (
    <>
      <List.Item
        title="Ethereum Name"
        accessoryTitle={searchText}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <OpenInBrowserAction
                title="View on Etherscan"
                url={`https://etherscan.io/enslookup-search?search=${searchText}`}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
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
            <OpenInBrowserAction title="View on Etherscan" url={`https://etherscan.io/tx/${transaction.id}`} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ searchText: "", result: null, isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  async function search(searchText: string) {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    try {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      const result = await performSearch(searchText, cancelRef.current.signal);
      setState((oldState) => ({
        ...oldState,
        result,
        isLoading: false,
        searchText,
      }));
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }
      console.error("search error", error);
      showToast(ToastStyle.Failure, "Could not perform search", String(error));
    }
  }

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult> {
  const params = new URLSearchParams();

  params.append("search", searchText);

  const response = await fetch(`https://etherscan.io/enslookup-search?${params.toString()}`, { signal });

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

    return {
      found: true,
      ens,
      registrant,
    };
  }

  if (ensResult.length > 0) {
    const address = ensResult.find(".alert a").first().text();

    const nameCard = ensResult.find(".card").first();

    const controller = $(nameCard.find(".row").get(0)).find("a").first().text();
    const registrant = $(nameCard.find(".row").get(1)).find("a").first().text();
    const expiration = $(nameCard.find(".row").get(2)).find(".col-md-9").text();
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

interface SearchResult {
  found: boolean;
  ens?: string;
  address?: string;

  controller?: string;
  registrant?: string;
  tokenId?: string;

  expiration?: string;

  transactions?: Transaction[];
}
