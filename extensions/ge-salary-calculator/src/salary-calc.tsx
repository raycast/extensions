import { Form, List, Action, ActionPanel, Icon, Color, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

const WEEKS_PER_MONTH = 4.333;
const TAX_RATE = 0.2;

interface CalcParams {
  monthly: number;
  hoursPerDay: number;
  daysPerWeek: number;
}

interface RatesResponse {
  rates: { USD: number; EUR: number };
}

function calcGross(monthly: number, hoursPerDay: number, daysPerWeek: number) {
  const hoursPerWeek = hoursPerDay * daysPerWeek;
  const hoursPerMonth = hoursPerWeek * WEEKS_PER_MONTH;
  const hourly = monthly / hoursPerMonth;
  return {
    hourly,
    daily: hourly * hoursPerDay,
    weekly: hourly * hoursPerWeek,
    monthly,
    yearly: monthly * 12,
  };
}

function Results({ monthly, hoursPerDay, daysPerWeek }: CalcParams) {
  const gross = calcGross(monthly, hoursPerDay, daysPerWeek);

  const { data, isLoading } = useFetch<RatesResponse>("https://api.frankfurter.app/latest?from=GEL&to=USD,EUR");

  const usdRate = data?.rates?.USD;
  const eurRate = data?.rates?.EUR;

  const periods = [
    { title: "Hourly", icon: Icon.Clock, gross: gross.hourly },
    { title: "Daily", icon: Icon.Calendar, gross: gross.daily },
    { title: "Weekly", icon: Icon.CalendarItem, gross: gross.weekly },
    { title: "Monthly", icon: Icon.BankNote, gross: gross.monthly },
    { title: "Yearly", icon: Icon.Star, gross: gross.yearly },
  ];

  return (
    <List navigationTitle={`${monthly.toFixed(2)} GEL / month`} isLoading={isLoading}>
      <List.Section title="GEL — Gross / Net (−20% tax)">
        {periods.map((p) => {
          const net = p.gross * (1 - TAX_RATE);
          return (
            <List.Item
              key={p.title}
              icon={p.icon}
              title={p.title}
              accessories={[
                { text: { value: p.gross.toFixed(2), color: Color.SecondaryText }, tooltip: "Gross GEL" },
                { text: { value: net.toFixed(2) + " GEL", color: Color.Green }, tooltip: "Net GEL" },
                ...(usdRate ? [{ text: (net * usdRate).toFixed(2) + " USD", tooltip: "Net USD" }] : []),
                ...(eurRate ? [{ text: (net * eurRate).toFixed(2) + " EUR", tooltip: "Net EUR" }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Net GEL" content={net.toFixed(2) + " GEL"} />
                  <Action.CopyToClipboard title="Copy Gross GEL" content={p.gross.toFixed(2) + " GEL"} />
                  {usdRate && (
                    <Action.CopyToClipboard title="Copy Net USD" content={(net * usdRate).toFixed(2) + " USD"} />
                  )}
                  {eurRate && (
                    <Action.CopyToClipboard title="Copy Net EUR" content={(net * eurRate).toFixed(2) + " EUR"} />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {(usdRate || eurRate) && (
        <List.Section title="Exchange Rates (1 GEL)">
          {usdRate && <List.Item icon={Icon.Globe} title="USD" accessories={[{ text: usdRate.toFixed(4) }]} />}
          {eurRate && <List.Item icon={Icon.Globe} title="EUR" accessories={[{ text: eurRate.toFixed(4) }]} />}
        </List.Section>
      )}
    </List>
  );
}

export default function SalaryCalc() {
  const { push } = useNavigation();
  const [salaryError, setSalaryError] = useState<string | undefined>();

  function handleSubmit(values: { salary: string; hoursPerDay: string; daysPerWeek: string }) {
    const monthly = parseFloat(values.salary);
    if (!values.salary || isNaN(monthly) || monthly <= 0) {
      setSalaryError("Enter a valid salary");
      return;
    }
    const hoursPerDay = parseFloat(values.hoursPerDay) || 8;
    const daysPerWeek = parseFloat(values.daysPerWeek) || 5;
    push(<Results monthly={monthly} hoursPerDay={hoursPerDay} daysPerWeek={daysPerWeek} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="salary"
        title="Monthly Salary (GEL)"
        placeholder="e.g. 3000"
        error={salaryError}
        onChange={() => setSalaryError(undefined)}
      />
      <Form.Separator />
      <Form.TextField id="hoursPerDay" title="Hours per Day" placeholder="Default: 8" />
      <Form.TextField id="daysPerWeek" title="Days per Week" placeholder="Default: 5" />
    </Form>
  );
}
