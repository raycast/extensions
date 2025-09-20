import { useState, useEffect, useRef, useCallback } from "react";
import {
  Icon,
  List,
  Action,
  ActionPanel,
  getPreferenceValues,
  Toast,
  showToast,
  LocalStorage,
  Form,
  useNavigation,
} from "@raycast/api";
import fetch, { Response, AbortError } from "node-fetch";
import { currencyCode2Name, currencyCode2CountryAndRegion } from "./currency";

const STORAGE_KEY_FROM_CURRENCY_CODE = "fromCurrencyCode";
const STORAGE_KEY_PINNED_CURRENCY_CODE = "pinnedCurrencyCode";

export default function Command() {
  const { searchText, state, setState, setSearchTextAndExchange } = useSearchText();

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
      searchText={searchText}
      isLoading={state.isLoading}
      onSearchTextChange={setSearchTextAndExchange}
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
          {Object.keys(currencyCode2CountryAndRegion).map((currencyCode: string) => (
            <List.Dropdown.Item
              key={`from-${currencyCode}`}
              title={`${currencyCode} - ${currencyCode2CountryAndRegion[currencyCode]}`}
              value={currencyCode}
              icon={getFlagEmoji(currencyCode.substring(0, 2))}
            />
          ))}
        </List.Dropdown>
      }
    >
      {state.currencyResult ? (
        <Exchange
          currencyResult={state.currencyResult}
          state={state}
          setState={setState}
          setSearchText={setSearchTextAndExchange}
        />
      ) : (
        <List.EmptyView
          icon={{ source: "../assets/start.png" }}
          title="Type something to get exchange result?"
          description="Example: '10', '1+2' '1 in USD' or '5.5 in USD at 2022/9/25'"
        />
      )}
    </List>
  );
}

function Exchange({
  currencyResult,
  state,
  setState,
  setSearchText,
}: {
  currencyResult: CurrencyResult;
  state: ExchangeState;
  setState: React.Dispatch<React.SetStateAction<ExchangeState>>;
  setSearchText: (amountExpression: string) => void;
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
            title={`Pinned Exchange from ${state.amount ? formatCurrency(state.amount, state.fromCurrencyCode) : 0} ${
              currencyCode2Name[state.fromCurrencyCode]
            }`}
          >
            {currencyResult.conversion_rate_pin_exchanged?.map((item: ConversionRate, index: number) => (
              <List.Item
                key={index}
                title={item.code}
                subtitle={
                  item.value !== Number.POSITIVE_INFINITY ? formatCurrency(item.value, item.code) : "No Currency"
                }
                accessories={[{ text: currencyCode2Name[item.code], icon: Icon.Pin }]}
                icon={{ source: getFlagEmoji(item.code.substring(0, 2)) }}
                actions={
                  <ExchangeResultActionPanel
                    setState={setState}
                    setSearchText={setSearchText}
                    state={state}
                    toCurrencyCode={item.code}
                    copyContent={item.value.toString()}
                  />
                }
              />
            ))}
          </List.Section>
          <List.Section
            title={`Exchange from ${state.amount ? formatCurrency(state.amount, state.fromCurrencyCode) : 0} ${
              currencyCode2Name[state.fromCurrencyCode]
            }`}
            subtitle={
              currencyResult.time_last_update_utc
                ? `Currency Rate Date is ${new Date(currencyResult.time_last_update_utc).toLocaleString()}`
                : `History Currency Rate Mode: Date is ${currencyResult.year}/${currencyResult.month}/${currencyResult.day}`
            }
          >
            {currencyResult.conversion_rate_exchanged?.map((item: ConversionRate, index: number) => (
              <List.Item
                key={index}
                title={item.code}
                subtitle={item.value !== Number.POSITIVE_INFINITY ? formatCurrency(item.value, item.code) : "∞"}
                accessories={[{ text: currencyCode2Name[item.code] }]}
                icon={{ source: getFlagEmoji(item.code.substring(0, 2)) }}
                actions={
                  <ExchangeResultActionPanel
                    setState={setState}
                    setSearchText={setSearchText}
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
  setSearchText: (amountExpression: string) => void;
}) {
  const { toCurrencyCode, copyContent, state, setState, setSearchText } = props;
  const { push } = useNavigation();
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
      <Action
        title="Set Currency Date"
        icon={Icon.Clock}
        onAction={() =>
          push(<SetCurrencyDateForm amountExpression={state.amountExpression} setSearchText={setSearchText} />)
        }
      />
    </ActionPanel>
  );
}

function useSearchText() {
  const { state, exchange, setState } = useExchange();
  const [searchText, setSearchText] = useState("");

  const setSearchTextAndExchange = function setSearchTextAndExchange(amountExpression: string) {
    setSearchText(amountExpression);
    exchange(amountExpression);
  };

  return {
    searchText: searchText,
    state: state,
    exchange: exchange,
    setState: setState,
    setSearchTextAndExchange: setSearchTextAndExchange,
  };
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
      let historyDate: Date | null = null;

      const matches = /(^[\d().+\-*/^]+)(.*)/.exec(amountExpression);
      console.log(matches);
      if (matches) {
        try {
          amount = eval(matches[1]);
        } catch (error) {
          console.error("not a right expression...");
        }

        if (matches[2]) {
          const historyMatches = /\s+at\s+(\d{4}\/\d{1,2}\/\d{1,2})/.exec(matches[2]);
          console.log(historyMatches);
          const historyMatchSize = historyMatches?.length;
          historyDate =
            historyMatchSize && historyMatchSize > 1 && historyMatches[1] ? new Date(historyMatches[1]) : null;
          historyDate = historyDate && !isNaN(historyDate?.getTime()) ? historyDate : null;

          const filterMatches = /\s+in\s+([a-zA-Z\s]*)/.exec(matches[2]);
          console.log(filterMatches);
          const filterMatchSize = filterMatches?.length;
          filter = filterMatchSize && filterMatchSize > 0 && filterMatches[1] ? filterMatches[1] : "";
          //fix when at is matched in keywords
          filter = filter.replace(/\s+at\s+/, " ").trim();
        }
      }

      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        amount: amount,
        filter: filter,
        historyDate: historyDate,
        isLoading: true,
      }));
      try {
        const result = await performExchange(
          amount,
          state.fromCurrencyCode,
          cancelRef.current.signal,
          filter,
          historyDate,
          state.pinnedCurrencyCodes,
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
    [cancelRef, state.fromCurrencyCode, state.pinnedCurrencyCodes],
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
  historyDate: Date | null,
  pinned?: Array<string>,
): Promise<CurrencyResult | undefined> {
  console.log(`start to exchange | ${fromCode} |${amount}|`);
  if (amount > 0) {
    // check if there's available cache for currency
    return LocalStorage.getItem<string>(
      `currency${
        historyDate ? historyDate.getFullYear() + "-" + (historyDate.getMonth() + 1) + "-" + historyDate.getDate() : ""
      }`,
    )
      .then((content) => {
        if (content) {
          const cachedData = JSON.parse(content) as CurrencyResult;
          // console.log(cachedData);
          if (
            historyDate ||
            (cachedData.time_next_update_unix && Math.round(Date.now() / 1000) - cachedData.time_next_update_unix < 0)
          ) {
            // cache valid
            return cachedData;
          }
        }

        return currencyAPI(historyDate, signal)
          .then(async (response) => {
            const responseJson = await response.json();

            const result = responseJson as CurrencyResult;
            if (result.result === "success") {
              LocalStorage.setItem(
                `currency${
                  historyDate
                    ? historyDate.getFullYear() + "-" + (historyDate.getMonth() + 1) + "-" + historyDate.getDate()
                    : ""
                }`,
                JSON.stringify(responseJson),
              );
              return result;
            } else {
              console.log(responseJson);
              if (
                result.result === "error" &&
                (result["error-type"] === "invalid-key" || result["error-type"] === "inactive-account")
              ) {
                throw Error("Invalid API Key, please check!");
              }
              throw Error(`exchangerate-api.com: ${result["error-type"]}`);
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

function currencyAPI(historyDate: Date | null, signal: AbortSignal): Promise<Response> {
  const { api_key } = getPreferenceValues();

  console.log(
    `make API call to https://v6.exchangerate-api.com/v6/${api_key}/${historyDate ? "history" : "latest"}/USD${
      historyDate
        ? "/" + historyDate.getFullYear() + "/" + (historyDate.getMonth() + 1) + "/" + historyDate.getDate()
        : ""
    }`,
  );
  return fetch(
    `https://v6.exchangerate-api.com/v6/${api_key}/${historyDate ? "history" : "latest"}/USD${
      historyDate
        ? "/" + historyDate.getFullYear() + "/" + (historyDate.getMonth() + 1) + "/" + historyDate.getDate()
        : ""
    }`,
    {
      signal: signal,
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  );
}

function enrichExchangeData(
  currencyData: CurrencyResult,
  amount: number,
  fromCode: string,
  filter: string,
  pinned?: Array<string>,
): CurrencyResult {
  const base = currencyData.conversion_rates[fromCode] || 0;
  console.log("filter: ", filter);

  currencyData.conversion_rate_exchanged = Object.keys(currencyData.conversion_rates)
    .filter(
      (it) =>
        (!pinned || pinned.indexOf(it) < 0) &&
        currencyCode2CountryAndRegion[it] !== undefined &&
        currencyCode2Name[it] !== undefined &&
        it !== fromCode &&
        (it.toLocaleLowerCase().indexOf(filter) >= 0 ||
          currencyCode2CountryAndRegion[it].toLocaleLowerCase().indexOf(filter) >= 0 ||
          currencyCode2Name[it].toLocaleLowerCase().indexOf(filter) >= 0),
    )
    .map<ConversionRate>((key: string) => ({
      code: key,
      value: (amount / base) * (currencyData.conversion_rates[key] || 0),
    }));

  currencyData.conversion_rate_pin_exchanged = pinned
    ?.filter(
      (it) =>
        currencyCode2CountryAndRegion[it] !== undefined &&
        currencyCode2Name[it] !== undefined &&
        it !== fromCode &&
        (it.toLocaleLowerCase().indexOf(filter) >= 0 ||
          currencyCode2CountryAndRegion[it].toLocaleLowerCase().indexOf(filter) >= 0 ||
          currencyCode2Name[it].toLocaleLowerCase().indexOf(filter) >= 0),
    )
    .map<ConversionRate>((key: string) => ({
      code: key,
      value: (amount / base) * (currencyData.conversion_rates[key] || 0),
    }));

  return currencyData as CurrencyResult;
}

function SetCurrencyDateForm(props: {
  amountExpression: string | undefined;
  setSearchText: (amountExpression: string) => void;
}) {
  const { setSearchText, amountExpression } = props;
  const { pop } = useNavigation();

  const regex = /\s+at\s+(\d{4}\/\d{1,2}\/\d{1,2})/;

  const historyMatches = /\s+at\s+(\d{4}\/\d{1,2}\/\d{1,2})/.exec(amountExpression || "");
  const historyMatchSize = historyMatches?.length;
  let historyDate =
    historyMatchSize && historyMatchSize > 1 && historyMatches[1] ? new Date(historyMatches[1]) : undefined;
  historyDate = historyDate && !isNaN(historyDate?.getTime()) ? historyDate : undefined;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set to Date"
            onSubmit={(values) => {
              console.log("onSubmit", values);
              const historyDate = values.historyDate;
              amountExpression && historyDate
                ? setSearchText(
                    amountExpression.replace(regex, "") +
                      ` at ${historyDate.getFullYear()}/${historyDate.getMonth() + 1}/${historyDate.getDate()}`,
                  )
                : null;
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="historyDate"
        title="Currecy History Date"
        defaultValue={historyDate}
        type={Form.DatePicker.Type.Date}
      />
    </Form>
  );
}

function getFlagEmoji(countryAndRegionCode: string): string {
  const codePoints = countryAndRegionCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  let v = countryAndRegionCode.startsWith("X") ? "🇺🇳" : String.fromCodePoint(...codePoints) || "🇺🇳";
  v = countryAndRegionCode === "AN" ? "🇺🇳" : v;
  return v;
}

function formatCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    }).format(amount);
  } catch (error) {
    console.error(`Error formatting currency: ${error}`);
    return amount.toString();
  }
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
  time_last_update_unix?: number;
  time_next_update_unix?: number;
  time_last_update_utc?: string;
  year?: number;
  month?: number;
  day?: number;
}

interface ConversionRate {
  code: string;
  value: number;
}
