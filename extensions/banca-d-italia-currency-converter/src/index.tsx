import {
  Form,
  ActionPanel,
  CopyToClipboardAction,
  showToast,
  ToastStyle,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { parse as parseCsv } from "papaparse";
import fetch from "node-fetch";
import { useStateFromLocalStorage } from "./hooks";

type CsvRow = {
  Country: string;
  Currency: string;
  "ISO Code": string;
  "UIC Code": string;
  Rate: string;
  "Rate convention": string;
  "Reference date (CET)": string;
};

type Rate = {
  country: string;
  currency: string;
  ISOCode: string;
  rate: number;
};

const ENDPOINT =
  "https://tassidicambio.bancaditalia.it/terzevalute-wf-web/rest/v1.0/dailyRates?currencyIsoCode=EUR&lang=en";

const EURO = {
  country: "Europe",
  currency: "Euro",
  ISOCode: "EUR",
  rate: 1,
};

const preferences = getPreferenceValues();

const decimals = Number(preferences.decimals);

export default function Command() {
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<Rate[]>([]);
  const [date, setDate] = useState<Date>(new Date());

  useEffect(() => {
    setLoading(true);

    fetch(`${ENDPOINT}&referenceDate=${date.toISOString().split("T")[0]}`)
      .then((response) => response.text())
      .then((text: string) => {
        const data = parseCsv<CsvRow>(text, { header: true }).data;

        if (data.length <= 1) {
          showToast(ToastStyle.Failure, "There are no rates for the requested date");
        }

        setRates([
          EURO,
          ...data
            .map((row) => ({
              country: row.Country,
              currency: row.Currency,
              ISOCode: row["ISO Code"],
              rate: parseFloat(row.Rate),
            }))
            .filter((rate) => rate.ISOCode != null),
        ]);
        setLoading(false);
      });
  }, [date]);

  const [fromCurrency, setFromCurrency] = useStateFromLocalStorage<string>("fromCurrency", "Euro");
  const [toCurrency, setToCurrency] = useStateFromLocalStorage<string>("toCurrency", "U.S. Dollar");
  const [fromAmount, setFromAmount] = useState("1");
  const [toAmount, setToAmount] = useState((1).toFixed(decimals));

  useEffect(() => {
    const fromRate = rates.find((rate) => rate.currency === fromCurrency);
    const toRate = rates.find((rate) => rate.currency === toCurrency);
    const fromAmountNumber = parseFloat(fromAmount);

    if (!Number.isNaN(fromAmountNumber) && fromRate && toRate) {
      if (fromRate.ISOCode === "EUR") {
        setToAmount((fromAmountNumber * toRate.rate).toFixed(decimals));
      }
      if (toRate.ISOCode === "EUR") {
        setToAmount((fromAmountNumber / fromRate.rate).toFixed(decimals));
      }
    } else {
      setToAmount("");
    }
  }, [fromAmount, toCurrency, fromCurrency, rates]);

  return (
    <Form
      actions={
        <ActionPanel>
          <CopyToClipboardAction content={toAmount} />
          <ActionPanel.Item
            title="Switch Currencies"
            icon={Icon.ArrowClockwise}
            onAction={() => {
              const temp = fromCurrency;
              setFromCurrency(toCurrency);
              setToCurrency(temp);
            }}
          />
        </ActionPanel>
      }
      isLoading={loading}
    >
      <Form.DatePicker id="referenceDate" title="Reference Date" value={date} onChange={setDate} />
      <Form.Dropdown id="from" title="From" storeValue value={fromCurrency} onChange={setFromCurrency}>
        {rates.map((rate, index) => (
          <Form.DropdownItem value={rate.currency} title={rate.ISOCode} key={index} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="fromAmount" title="Amount" placeholder="1.00" value={fromAmount} onChange={setFromAmount} />

      <Form.Dropdown id="to" title="To" storeValue value={toCurrency} onChange={setToCurrency}>
        {rates.map((rate, index) => (
          <Form.DropdownItem value={rate.currency} title={rate.ISOCode} key={index} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="toAmount" title="Amount" placeholder="1.00" value={toAmount} onChange={setToAmount} />
    </Form>
  );
}
