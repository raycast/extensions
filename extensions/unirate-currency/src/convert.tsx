import { useEffect, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  CurrencyEntry,
  UniRateError,
  convertCurrency,
  fetchCurrencies,
  getDefaultBase,
  getDefaultDecimals,
} from "./unirate";

const HISTORICAL_FLOOR = new Date(1999, 0, 4);

function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Command() {
  const [currencies, setCurrencies] = useState<CurrencyEntry[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  const defaultBase = useMemo(() => getDefaultBase(), []);
  const decimals = useMemo(() => getDefaultDecimals(), []);
  const today = useMemo(() => new Date(), []);

  const [from, setFrom] = useState(defaultBase);
  const [to, setTo] = useState(defaultBase === "EUR" ? "USD" : "EUR");
  const [amount, setAmount] = useState("1");
  const [useHistorical, setUseHistorical] = useState(false);
  const [historicalDate, setHistoricalDate] = useState<Date | null>(today);

  const [result, setResult] = useState<string | null>(null);
  const [rawResult, setRawResult] = useState<number | null>(null);
  const [resultDate, setResultDate] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const currencyCodes = useMemo(() => new Set(currencies.map((currency) => currency.code)), [currencies]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const list = await fetchCurrencies(controller.signal);
        if (!controller.signal.aborted) setCurrencies(list);
      } catch (err) {
        if (!controller.signal.aborted) {
          await showFailureToast(err, { title: "Could not load currency list" });
        }
      } finally {
        if (!controller.signal.aborted) setLoadingCurrencies(false);
      }
    })();
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (currencyCodes.size === 0) return;
    if (!currencyCodes.has(from)) {
      setFrom(defaultBase);
    }
    if (!currencyCodes.has(to)) {
      setTo(defaultBase === "EUR" ? "USD" : "EUR");
    }
  }, [currencyCodes, defaultBase, from, to]);

  const amountNumber = Number.parseFloat(amount);
  const formValid =
    Number.isFinite(amountNumber) &&
    amountNumber > 0 &&
    /^[A-Z]{3,5}$/.test(from) &&
    /^[A-Z]{3,5}$/.test(to) &&
    (!useHistorical || historicalDate !== null);

  async function handleSubmit() {
    if (!formValid) {
      await showFailureToast(new Error("Enter a positive amount and pick currencies."), {
        title: "Invalid input",
      });
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setConverting(true);
    setResult(null);
    setRawResult(null);
    setResultDate(null);
    try {
      const date = useHistorical && historicalDate ? historicalDate : null;
      const data = await convertCurrency(from, to, amountNumber, date, controller.signal);
      setResult(formatNumber(data.result, decimals));
      setRawResult(data.result);
      setResultDate(data.date ?? (date ? localIsoDate(date) : "today"));
      await showToast({
        style: Toast.Style.Success,
        title: `${formatNumber(amountNumber, decimals)} ${from} = ${formatNumber(data.result, decimals)} ${to}`,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const title =
        err instanceof UniRateError && err.status === 403 ? "Pro plan required for historical" : "Conversion failed";
      await showFailureToast(err, { title });
    } finally {
      setConverting(false);
    }
  }

  return (
    <Form
      isLoading={loadingCurrencies || converting}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.ArrowRight} title="Convert" onSubmit={handleSubmit} />
          {result ? (
            <Action.CopyToClipboard
              title="Copy Result"
              content={String(rawResult ?? "")}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          ) : null}
          <Action
            title="Switch Currencies"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            onAction={() => {
              setFrom(to);
              setTo(from);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="amount" title="Amount" value={amount} onChange={setAmount} placeholder="1.00" />
      <Form.Dropdown
        id="from"
        title="From"
        value={currencyCodes.has(from) ? from : undefined}
        onChange={setFrom}
        storeValue
      >
        {currencies.map((c) => (
          <Form.Dropdown.Item key={`from-${c.code}`} value={c.code} title={c.code} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="to" title="To" value={currencyCodes.has(to) ? to : undefined} onChange={setTo} storeValue>
        {currencies.map((c) => (
          <Form.Dropdown.Item key={`to-${c.code}`} value={c.code} title={c.code} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Checkbox
        id="useHistorical"
        title="Historical"
        label="Use a past date (Pro plan required)"
        value={useHistorical}
        onChange={setUseHistorical}
      />
      {useHistorical ? (
        <Form.DatePicker
          id="historicalDate"
          title="Date"
          value={historicalDate}
          onChange={(d) => setHistoricalDate(d)}
          min={HISTORICAL_FLOOR}
          max={today}
        />
      ) : null}
      {result ? (
        <Form.Description
          title="Result"
          text={`${formatNumber(amountNumber, decimals)} ${from} = ${result} ${to}${
            resultDate ? `  (${resultDate})` : ""
          }`}
        />
      ) : null}
    </Form>
  );
}
