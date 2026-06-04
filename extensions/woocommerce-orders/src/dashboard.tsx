import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";

import { formatCurrencyAmount } from "./format";
import { SalesReportPeriod, WooCommerceSalesReport } from "./types";
import { fetchDashboardData } from "./woocommerce";

const periodLabels: Record<SalesReportPeriod, string> = {
  today: "Today",
  week: "This Week",
};

export default function Dashboard() {
  const [period, setPeriod] = useState<SalesReportPeriod>("today");
  const [report, setReport] = useState<WooCommerceSalesReport>();
  const [currency, setCurrency] = useState("EUR");
  const [source, setSource] = useState<"reports" | "orders">("reports");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setIsLoading(true);
    setError(undefined);

    fetchDashboardData(period)
      .then(({ report, currency, source }) => {
        setReport(report);
        setCurrency(currency);
        setSource(source);

        if (source === "orders") {
          showToast({
            style: Toast.Style.Animated,
            title: "Using order totals fallback",
            message: "WooCommerce reports were unavailable.",
          });
        }
      })
      .catch((error: Error) => {
        setReport(undefined);
        setError(error.message);
        showToast({
          style: Toast.Style.Failure,
          title: "Could not load WooCommerce dashboard",
          message: error.message,
        });
      })
      .finally(() => setIsLoading(false));
  }, [period]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search dashboard metrics..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Period"
          value={period}
          onChange={(value) => setPeriod(value as SalesReportPeriod)}
        >
          <List.Dropdown.Item title="Today" value="today" />
          <List.Dropdown.Item title="This Week" value="week" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView title="Could not load dashboard" description={error} />
      ) : null}
      {!error && report ? (
        <List.Section title={periodLabels[period]}>
          <MetricItem
            icon={Icon.BarChart}
            title="Source"
            value={
              source === "reports" ? "WooCommerce Reports" : "Orders Fallback"
            }
            tooltip={
              source === "reports"
                ? "Totals are provided by WooCommerce reports"
                : "Totals were calculated from paid orders because WooCommerce reports were unavailable"
            }
          />
          <MetricItem
            icon={Icon.Coins}
            title="Total Sales"
            value={formatCurrencyAmount(report.total_sales, currency)}
            tooltip="Gross sales for the selected period"
          />
          <MetricItem
            icon={Icon.Receipt}
            title="Net Sales"
            value={formatCurrencyAmount(report.net_sales, currency)}
            tooltip="Sales after refunds, coupons, and taxes according to WooCommerce reports"
          />
          <MetricItem
            icon={Icon.Calculator}
            title="Taxes"
            value={formatCurrencyAmount(report.total_tax, currency)}
            tooltip="Total tax collected"
          />
          <MetricItem
            icon={Icon.Box}
            title="Shipping"
            value={formatCurrencyAmount(report.total_shipping, currency)}
            tooltip="Shipping charged to customers"
          />
          <MetricItem
            icon={Icon.Cart}
            title="Orders"
            value={String(report.total_orders)}
            tooltip="Paid orders counted by WooCommerce reports"
          />
          <MetricItem
            icon={Icon.Tag}
            title="Discounts"
            value={formatCurrencyAmount(report.total_discount, currency)}
            tooltip="Coupons and discounts"
          />
          <MetricItem
            icon={Icon.ArrowCounterClockwise}
            title="Refunds"
            value={formatCurrencyAmount(report.total_refunds, currency)}
            tooltip="Refunded amount"
          />
        </List.Section>
      ) : null}
    </List>
  );
}

function MetricItem({
  icon,
  title,
  value,
  tooltip,
}: {
  icon: Icon;
  title: string;
  value: string;
  tooltip: string;
}) {
  return (
    <List.Item
      icon={{ source: icon, tintColor: Color.PrimaryText }}
      title={title}
      accessories={[{ text: value, tooltip }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={`Copy ${title}`} content={value} />
        </ActionPanel>
      }
    />
  );
}
