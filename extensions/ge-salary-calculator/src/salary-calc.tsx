import {
  Form,
  List,
  Action,
  ActionPanel,
  Icon,
  Color,
  LocalStorage,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { useFetch, usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  type TaxRegime,
  type InputMode,
  type LastCalc,
  calcGross,
  applyTax,
  reverseToGross,
  regimeLabel,
} from "./utils";

interface RatesResponse {
  rates: { USD: number; EUR: number; GBP: number; TRY: number };
}

interface CalcParams {
  monthly: number;
  hoursPerDay: number;
  daysPerWeek: number;
  regime: TaxRegime;
}

function Results({ monthly, hoursPerDay, daysPerWeek, regime }: CalcParams) {
  const gross = calcGross(monthly, hoursPerDay, daysPerWeek);

  const { data, isLoading } = useFetch<RatesResponse>("https://api.frankfurter.app/latest?from=GEL&to=USD,EUR,GBP,TRY");

  const rates = data?.rates;

  const periods = [
    { title: "Hourly", icon: Icon.Clock, gross: gross.hourly },
    { title: "Daily", icon: Icon.Calendar, gross: gross.daily },
    { title: "Weekly", icon: Icon.CalendarItem, gross: gross.weekly },
    { title: "Monthly", icon: Icon.BankNote, gross: gross.monthly },
    { title: "Yearly", icon: Icon.Star, gross: gross.yearly },
  ];

  return (
    <List navigationTitle={`${monthly.toFixed(2)} GEL gross / month`} isLoading={isLoading}>
      <List.Section title={`GEL — Gross / Net (${regimeLabel(regime)})`}>
        {periods.map((p) => {
          const net = applyTax(p.gross, regime);
          return (
            <List.Item
              key={p.title}
              icon={p.icon}
              title={p.title}
              accessories={[
                { text: { value: net.toFixed(2) + " GEL", color: Color.Green }, tooltip: "Net GEL" },
                ...(rates?.USD ? [{ text: (net * rates.USD).toFixed(2) + " USD", tooltip: "Net USD" }] : []),
                ...(rates?.EUR ? [{ text: (net * rates.EUR).toFixed(2) + " EUR", tooltip: "Net EUR" }] : []),
                ...(rates?.GBP ? [{ text: (net * rates.GBP).toFixed(2) + " GBP", tooltip: "Net GBP" }] : []),
                ...(rates?.TRY ? [{ text: (net * rates.TRY).toFixed(2) + " TRY", tooltip: "Net TRY" }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Net GEL" content={net.toFixed(2) + " GEL"} />
                  <Action.CopyToClipboard title="Copy Gross GEL" content={p.gross.toFixed(2) + " GEL"} />
                  {rates?.USD && (
                    <Action.CopyToClipboard title="Copy Net USD" content={(net * rates.USD).toFixed(2) + " USD"} />
                  )}
                  {rates?.EUR && (
                    <Action.CopyToClipboard title="Copy Net EUR" content={(net * rates.EUR).toFixed(2) + " EUR"} />
                  )}
                  {rates?.GBP && (
                    <Action.CopyToClipboard title="Copy Net GBP" content={(net * rates.GBP).toFixed(2) + " GBP"} />
                  )}
                  {rates?.TRY && (
                    <Action.CopyToClipboard title="Copy Net TRY" content={(net * rates.TRY).toFixed(2) + " TRY"} />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {rates && (
        <List.Section title="Exchange Rates (1 GEL)">
          {rates.USD && <List.Item icon={Icon.Globe} title="USD" accessories={[{ text: rates.USD.toFixed(4) }]} />}
          {rates.EUR && <List.Item icon={Icon.Globe} title="EUR" accessories={[{ text: rates.EUR.toFixed(4) }]} />}
          {rates.GBP && <List.Item icon={Icon.Globe} title="GBP" accessories={[{ text: rates.GBP.toFixed(4) }]} />}
          {rates.TRY && <List.Item icon={Icon.Globe} title="TRY" accessories={[{ text: rates.TRY.toFixed(4) }]} />}
        </List.Section>
      )}
    </List>
  );
}

export default function SalaryCalc() {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<Preferences.SalaryCalc>();
  const { data: lastSalary } = usePromise(LocalStorage.getItem<string>, ["lastSalary"]);
  const [salaryError, setSalaryError] = useState<string | undefined>();
  const [inputMode, setInputMode] = useState<InputMode>("gross");

  function handleSubmit(values: { salary: string; hoursPerDay: string; daysPerWeek: string }) {
    const monthly = parseFloat(values.salary);
    if (!values.salary || isNaN(monthly) || monthly <= 0) {
      setSalaryError("Enter a valid salary");
      return;
    }
    const hoursPerDay = parseFloat(values.hoursPerDay) || parseFloat(prefs.hoursPerDay) || 8;
    const daysPerWeek = parseFloat(values.daysPerWeek) || parseFloat(prefs.daysPerWeek) || 5;
    const regime = prefs.taxRegime;
    const gross = inputMode === "net" ? reverseToGross(monthly, regime) : monthly;
    const net = applyTax(gross, regime);

    LocalStorage.setItem("lastSalary", values.salary);
    LocalStorage.setItem(
      "lastCalc",
      JSON.stringify({ gross, net, regime, hoursPerDay, daysPerWeek } satisfies LastCalc),
    );

    push(<Results monthly={gross} hoursPerDay={hoursPerDay} daysPerWeek={daysPerWeek} regime={regime} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="inputMode" title="Input Mode" onChange={(v) => setInputMode(v as InputMode)}>
        <Form.Dropdown.Item value="gross" title="Monthly Gross" />
        <Form.Dropdown.Item value="net" title="Monthly Net" />
      </Form.Dropdown>
      <Form.TextField
        id="salary"
        title={inputMode === "net" ? "Monthly Net Salary (GEL)" : "Monthly Gross Salary (GEL)"}
        placeholder="e.g. 3000"
        defaultValue={lastSalary ?? ""}
        error={salaryError}
        onChange={() => setSalaryError(undefined)}
      />
      <Form.Separator />
      <Form.TextField id="hoursPerDay" title="Hours per Day" placeholder={`Default: ${prefs.hoursPerDay}`} />
      <Form.TextField id="daysPerWeek" title="Days per Week" placeholder={`Default: ${prefs.daysPerWeek}`} />
    </Form>
  );
}
