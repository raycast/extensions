import { Action, ActionPanel, Detail, Icon, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { AddSubscriptionForm } from "./add-subscription";
import { SubscriptionDetail } from "./subscription-detail";
import { SubscriptionList } from "./subscription-list";
import { useSubscriptions } from "./storage";
import {
  buildCalendarMarkdown,
  formatCurrency,
  formatCycle,
  getMonthSubscriptions,
  getMonthlyTotal,
  getSubscriptionIcon,
} from "./utils";

interface RatesResponse {
  rates: Record<string, number>;
}

export default function ManageSubscription() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { subscriptions, isLoading } = useSubscriptions();
  const { primaryCurrency } = getPreferenceValues<Preferences>();

  const { data: ratesData, isLoading: ratesLoading } = useFetch<RatesResponse>(
    `https://api.frankfurter.app/latest?from=${primaryCurrency}`,
    { keepPreviousData: true },
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const monthSubs = getMonthSubscriptions(month, year, subscriptions);
  const monthTotal = getMonthlyTotal(subscriptions, month, year, primaryCurrency, ratesData?.rates);

  const markdown = buildCalendarMarkdown(year, month, subscriptions);

  function prevMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  return (
    <Detail
      isLoading={isLoading || ratesLoading}
      navigationTitle="Subscription Manager"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title={`Monthly Total (${primaryCurrency})`}
            text={ratesLoading ? "Loading…" : formatCurrency(monthTotal, primaryCurrency)}
            icon={Icon.BankNote}
          />
          <Detail.Metadata.Label title="Subscriptions" text={`${monthSubs.length} this month`} icon={Icon.Calendar} />
          <Detail.Metadata.Separator />
          {monthSubs.length > 0 ? (
            monthSubs.map((sub, i) => (
              <Detail.Metadata.Label
                key={sub.id}
                title={
                  i === 0 || monthSubs[i - 1].billingDay !== sub.billingDay ? `${sub.billingDay} ${monthName}` : ""
                }
                text={`${sub.name} · ${formatCurrency(sub.amount, sub.currency)} ${formatCycle(sub.billingCycle)}`}
                icon={getSubscriptionIcon(sub)}
              />
            ))
          ) : (
            <Detail.Metadata.Label title="No subscriptions" text="Press ⌘N to add" icon={Icon.Plus} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="All Subscriptions"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            target={<SubscriptionList />}
          />
          <ActionPanel.Section title="Navigation">
            <Action
              title="Previous Month"
              icon={Icon.ChevronLeft}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
              onAction={prevMonth}
            />
            <Action
              title="Next Month"
              icon={Icon.ChevronRight}
              shortcut={{ modifiers: [], key: "arrowRight" }}
              onAction={nextMonth}
            />
            <Action
              title="Go to Today"
              icon={Icon.Calendar}
              shortcut={{ modifiers: [], key: "t" }}
              onAction={goToToday}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Manage">
            <Action.Push
              title="Add Subscription"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<AddSubscriptionForm />}
            />
          </ActionPanel.Section>

          {monthSubs.length > 0 && (
            <ActionPanel.Section title={`${monthName} ${year}`}>
              {monthSubs.map((sub) => (
                <Action.Push
                  key={sub.id}
                  title={`${sub.billingDay} ${monthName} · ${sub.name}`}
                  icon={getSubscriptionIcon(sub)}
                  target={<SubscriptionDetail id={sub.id} />}
                />
              ))}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
