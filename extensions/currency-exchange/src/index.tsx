import { useState, useEffect, useRef, useCallback } from "react";
import { Icon, List, Action, ActionPanel, getPreferenceValues, Toast, showToast, LocalStorage } from "@raycast/api";
import fetch, { Response, AbortError } from "node-fetch";
import { currencyCode2Name, currencyCode2Country } from "./currency";

const STORAGE_KEY_FROM_CURRENCY_CODE = "fromCurrencyCode";
const STORAGE_KEY_PINNED_CURRENCY_CODE = "pinnedCurrencyCode";

export default function Command() {
  const { state, exchange, setState } = useExchange();

  useEffect(() => {
    (async () => {
      const fromCodeCurrency = await LocalStorage.getItem<string>(STORAGE_KEY_FROM_CURRENCY_CODE);
      const pinnedCodeCurrencyText = await LocalStorage.getItem<string>(STORAGE_KEY_PINNED_CURRENCY_CODE);
      if (pinnedCodeCurrencyText) {
        console.log(pinnedCodeCurrencyText);
        setState((oldState) => ({
          ...oldState,
          pinnedCurrencyCodes: JSON.parse(pinnedCodeCurrencyText),
        }));
      }
      if (fromCodeCurrency) {
        setState((oldState) => ({
          ...oldState,
          fromCurrencyCode: fromCodeCurrency,
        }));
      }
    })();
  }, []);

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={exchange}
      searchBarPlaceholder={`Input how much ${currencyCode2Name[state.fromCurrencyCode]}`}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="From Currency"
          value={state.fromCurrencyCode}
          onChange={(newValue) => {
            LocalStorage.setItem(STORAGE_KEY_FROM_CURRENCY_CODE, newValue);
            setState((previous) => ({ ...previous, fromCurrencyCode: newValue }));
          }}
        >
          {Object.keys(currencyCode2Country).map((currencyCode: string) => (
            <List.Dropdown.Item
              key={`from-${currencyCode}`}
              title={`${currencyCode} - ${currencyCode2Country[currencyCode]}`}
              value={currencyCode}
              icon={getFlagEmoji(currencyCode.substring(0, 2))}
            />
          ))}
        </List.Dropdown>
      }
    >
      {state.currencyResult ? (
        <Exchange currencyResult={state.currencyResult} state={state} setState={setState} />
      ) : (
        <List.EmptyView
          icon={{ source: "../assets/start.png" }}
          title="Type something to get exchange result?"
          description="Example: '10', '1+2' or '1 in USD'"
        />
      )}
    </List>
  );
}

function Exchange({
  currencyResult,
  state,
  setState,
}: {
  currencyResult: CurrencyResult;
  state: ExchangeState;
  setState: React.Dispatch<React.SetStateAction<ExchangeState>>;
}) {
  if (currencyResult.result !== "success") {
    const errorMessage = `
    * error code: ${currencyResult.result}.
    * you can find all error code in here. (https://www.exchangerate-api.com/docs/standard-requests)`;
    showToast({
      style: Toast.Style.Failure,
      title: "Exchange Error",
      message: errorMessage,
    });
  }
  return (
    <>
      {currencyResult.conversion_rate_exchanged ? (
        <>
          <List.Section
            title={`Pinned Exchange from ${state.amount ? parseFloat(state.amount.toFixed(4)) : 0} ${
              currencyCode2Name[state.fromCurrencyCode]
            }`}
          >
            {currencyResult.conversion_rate_pin_exchanged?.map((item: ConversionRate, index: number) => (
              <List.Item
                key={index}
                title={item.code}
                subtitle={item.value.toFixed(4)}
                accessoryTitle={currencyCode2Name[item.code]}
                accessoryIcon={Icon.Pin}
                icon={{ source: getFlagEmoji(item.code.substring(0, 2)) }}
                actions={
                  <ExchangeResultActionPanel
                    setState={setState}
                    state={state}
                    toCurrencyCode={item.code}
                    copyContent={item.value.toString()}
                  />
                }
              />
            ))}
          </List.Section>
          <List.Section
            title={`Exchange from ${state.amount ? parseFloat(state.amount.toFixed(4)) : 0} ${
              currencyCode2Name[state.fromCurrencyCode]
            }`}
            subtitle={`Currency Rate updated at ${new Date(currencyResult.time_last_update_utc).toLocaleString()}`}
          >
            {currencyResult.conversion_rate_exchanged?.map((item: ConversionRate, index: number) => (
              <List.Item
                key={index}
                title={item.code}
                subtitle={item.value.toFixed(4)}
                accessoryTitle={currencyCode2Name[item.code]}
                icon={{ source: getFlagEmoji(item.code.substring(0, 2)) }}
                actions={
                  <ExchangeResultActionPanel
                    setState={setState}
                    state={state}
                    toCurrencyCode={item.code}
                    copyContent={item.value.toString()}
                  />
                }
              />
            ))}
          </List.Section>
        </>
      ) : null}
    </>
  );
}

function ExchangeResultActionPanel(props: {
  toCurrencyCode: string;
  copyContent: string;
  state: ExchangeState;
  setState: React.Dispatch<React.SetStateAction<ExchangeState>>;
}) {
  const { toCurrencyCode, copyContent, state, setState } = props;
  return (
    <ActionPanel>
      <Action.CopyToClipboard content={copyContent} />
      <Action
        icon={Icon.Pin}
        onAction={() => {
          if (state.pinnedCurrencyCodes && state.pinnedCurrencyCodes.indexOf(toCurrencyCode) >= 0) {
            //unpin it
            const pinnedUpdated = state.pinnedCurrencyCodes.filter((item) => item !== toCurrencyCode);
            LocalStorage.setItem(STORAGE_KEY_PINNED_CURRENCY_CODE, JSON.stringify(pinnedUpdated));
            setState((oldState) => ({
              ...oldState,
              pinnedCurrencyCodes: pinnedUpdated,
            }));
          } else {
            //pin it
            const pinnedUpdated = state.pinnedCurrencyCodes
              ? state.pinnedCurrencyCodes.concat(toCurrencyCode)
              : [toCurrencyCode];
            LocalStorage.setItem(STORAGE_KEY_PINNED_CURRENCY_CODE, JSON.stringify(pinnedUpdated));
            setState((oldState) => ({
              ...oldState,
              pinnedCurrencyCodes: pinnedUpdated,
            }));
          }
        }}
        shortcut={{ modifiers: ["shift"], key: "return" }}
        title={`${
          state.pinnedCurrencyCodes && state.pinnedCurrencyCodes.indexOf(toCurrencyCode) >= 0 ? "Unpin It" : "Pin It"
        }`}
      />
    </ActionPanel>
  );
}

function useExchange() {
  const [state, setState] = useState<ExchangeState>({
    currencyResult: undefined,
    fromCurrencyCode: "USD",
    filter: "",
    isLoading: true,
  });
  const cancelRef = useRef<AbortController | null>(null);

  const exchange = useCallback(
    async function exchange(amountExpression: string) {
      let amount = 0;
      let filter = "";

      const matches = /(^[\d().+\-*/^]+)(.*)/.exec(amountExpression);
      console.log(matches);
      if (matches) {
        try {
          amount = eval(matches[1]);
        } catch (error) {
          console.error("not a right expression...");
        }

        if (matches[2]) {
          const filterMatches = /\s+in\s+([a-zA-Z\s]+)/.exec(matches[2]);
          console.log(filterMatches);
          filter = filterMatches ? filterMatches[1] : "";
        }
      }

      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        amount: amount,
        filter: filter,
        isLoading: true,
      }));
      try {
        console.log("country:", state.fromCurrencyCode);
        const result = await performExchange(
          amount,
          state.fromCurrencyCode,
          cancelRef.current.signal,
          filter,
          state.pinnedCurrencyCodes
        );
        console.log(result?.conversion_rate_exchanged?.at(0));
        setState((oldState) => ({
          ...oldState,
          currencyResult: result,
          amountExpression: amountExpression,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        if (error instanceof AbortError) {
          return;
        }

        console.error("search error", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Could not perform search",
          message: String(error),
        });
      }
    },
    [cancelRef, state.fromCurrencyCode, state.pinnedCurrencyCodes]
  );

  useEffect(() => {
    exchange(state.amountExpression || "");
    return () => {
      cancelRef.current?.abort();
    };
  }, [state.fromCurrencyCode, state.pinnedCurrencyCodes]);

  return {
    state: state,
    exchange: exchange,
    setState: setState,
  };
}

async function performExchange(
  amount: number,
  fromCode: string,
  signal: AbortSignal,
  filter: string,
  pinned?: Array<string>
): Promise<CurrencyResult | undefined> {
  console.log(`start to exchange | ${fromCode} |${amount}|`);
  if (amount > 0) {
    // check if there's available cache for currency
    return LocalStorage.getItem<string>("currency")
      .then((content) => {
        if (content) {
          const cachedData = JSON.parse(content) as CurrencyResult;
          //console.log(cachedData);
          if (Math.round(Date.now() / 1000) - cachedData.time_next_update_unix < 0) {
            // cache valid
            return cachedData;
          }
        }

        return currencyAPI(signal)
          .then(async (response) => {
            const responseJson = await response.json();

            const result = responseJson as CurrencyResult;
            if (result.result === "success") {
              LocalStorage.setItem("currency", JSON.stringify(responseJson));
              return result;
            } else {
              console.log(responseJson);
              if (
                result.result === "error" &&
                (result["error-type"] === "invalid-key" || result["error-type"] === "inactive-account")
              ) {
                throw Error("Invalid API Key, please check!");
              }
              throw Error(result["error-type"]);
            }
          })
          .catch((error: Error) => {
            showToast({
              style: Toast.Style.Failure,
              title: "Error",
              message: error.message,
            });
          });
      })
      .then((currencyData: CurrencyResult | void) => {
        if (currencyData) {
          return enrichExchangeData(currencyData, amount, fromCode, filter.toLocaleLowerCase(), pinned);
        }
      });
  } else {
    return undefined;
  }
}

function currencyAPI(signal: AbortSignal): Promise<Response> {
  const { api_key } = getPreferenceValues();

  return fetch(`https://v6.exchangerate-api.com/v6/${api_key}/latest/USD`, {
    signal: signal,
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

function enrichExchangeData(
  currencyData: CurrencyResult,
  amount: number,
  fromCode: string,
  filter: string,
  pinned?: Array<string>
): CurrencyResult {
  const base = currencyData.conversion_rates[fromCode] || 0;
  console.log("filter: ", filter);

  currencyData.conversion_rate_exchanged = Object.keys(currencyData.conversion_rates)
    .filter(
      (it) =>
        (!pinned || pinned.indexOf(it) < 0) &&
        it !== fromCode &&
        (it.toLocaleLowerCase().indexOf(filter) >= 0 ||
          currencyCode2Country[it].toLocaleLowerCase().indexOf(filter) >= 0 ||
          currencyCode2Name[it].toLocaleLowerCase().indexOf(filter) >= 0)
    )
    .map<ConversionRate>((key: string) => ({
      code: key,
      value: (amount / base) * (currencyData.conversion_rates[key] || 0),
    }));

  currencyData.conversion_rate_pin_exchanged = pinned
    ?.filter(
      (it) =>
        it !== fromCode &&
        (it.toLocaleLowerCase().indexOf(filter) >= 0 ||
          currencyCode2Country[it].toLocaleLowerCase().indexOf(filter) >= 0 ||
          currencyCode2Name[it].toLocaleLowerCase().indexOf(filter) >= 0)
    )
    .map<ConversionRate>((key: string) => ({
      code: key,
      value: (amount / base) * (currencyData.conversion_rates[key] || 0),
    }));

  return currencyData as CurrencyResult;
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  let v = countryCode.startsWith("X") ? "🇺🇳" : String.fromCodePoint(...codePoints) || "🇺🇳";
  v = countryCode === "TW" ? "🇨🇳" : v;
  v = countryCode === "AN" ? "🇺🇳" : v;
  return v;
}

interface ExchangeState {
  currencyResult?: CurrencyResult;
  amountExpression?: string;
  amount?: number;
  filter?: string;
  isLoading: boolean;
  fromCurrencyCode: string;
  pinnedCurrencyCodes?: Array<string>;
}

interface CurrencyResult {
  base_code: string;
  result: string;
  ["error-type"]: string;
  conversion_rates: { [key: string]: number };
  conversion_rate_exchanged?: Array<ConversionRate>;
  conversion_rate_pin_exchanged?: Array<ConversionRate>;
  time_last_update_unix: number;
  time_next_update_unix: number;
  time_last_update_utc: string;
}

interface ConversionRate {
  code: string;
  value: number;
}
