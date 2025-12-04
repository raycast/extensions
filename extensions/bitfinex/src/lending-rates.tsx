import { useState, useMemo, useCallback } from "react";
import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import * as asciichart from "asciichart";

import { getCurrency, getPreferenceValues } from "./lib/preference";
import { useFundingStatsHistory } from "./lib/hooks";
import { formatToYearlyRate } from "./lib/utils";
import { candlesTimeFrame, tfKeyToLabel, tfOptions } from "./lib/lendingRatesUtils";

type LendingRatesDropdownProps = {
  onChange: (value: string) => void;
};

function LendingRatesDropdown(props: LendingRatesDropdownProps) {
  return (
    <List.Dropdown tooltip="Set rates time frame" storeValue={true} onChange={props.onChange}>
      {tfOptions.map(([value, label]) => (
        <List.Dropdown.Item key={value} title={label} value={value} />
      ))}
    </List.Dropdown>
  );
}

function LendingRatesSubMenu(props: LendingRatesDropdownProps) {
  return (
    <ActionPanel.Submenu title="Set rates time frame" icon={Icon.Calendar}>
      {tfOptions.map(([value, label]) => (
        <Action key={value} title={label} onAction={() => props.onChange(value)} />
      ))}
    </ActionPanel.Submenu>
  );
}

const defaultRateView = getPreferenceValues().default_rate_view;

const useToggleChartView = () => {
  const [isChartView, setIsChartView] = useState(defaultRateView === "chart");
  const onToggleChartView = useCallback(() => setIsChartView(!isChartView), [isChartView]);

  const action = (
    <Action
      icon={isChartView ? Icon.List : Icon.LineChart}
      title={`Switch to ${isChartView ? "list" : "chart"} view`}
      onAction={onToggleChartView}
    />
  );

  return {
    action,
    isChartView,
  };
};

export default function LendingRates() {
  const [tf, setTf] = useState<keyof typeof candlesTimeFrame>("1h");
  const query = useMemo(() => candlesTimeFrame[tf], [tf]);

  const { data = [], isLoading } = useFundingStatsHistory(query);

  const { action, isChartView } = useToggleChartView();

  if (isChartView) {
    return <LendingRateChart rates={data} setTf={setTf} tf={tf} toggleAction={action} />;
  } else {
    return (
      <List
        isLoading={isLoading}
        searchBarAccessory={
          <LendingRatesDropdown onChange={(value) => setTf(value as keyof typeof candlesTimeFrame)} />
        }
      >
        <List.Section title={`Lending Rates for ${getCurrency()}`}>
          {data.map((r) => {
            const [dateString, rawLowRate, rawAverageRate, rawHighRate] = r;

            const date = new Date(dateString);

            const averageRate = formatToYearlyRate(rawAverageRate);
            const lowRate = formatToYearlyRate(rawLowRate);
            const highRate = formatToYearlyRate(rawHighRate);

            return (
              <List.Item
                title={date.toLocaleString()}
                key={date.getTime()}
                actions={<ActionPanel>{action}</ActionPanel>}
                accessories={[
                  {
                    text: `${averageRate}% (avg)`,
                  },
                  {
                    text: `${highRate}% (hi)`,
                  },
                  {
                    text: `${lowRate}% (lo)`,
                  },
                ]}
              />
            );
          })}
        </List.Section>
      </List>
    );
  }
}

enum RateToView {
  Average,
  High,
  Low,
}

function LendingRateChart({
  rates: data,
  setTf,
  tf,
  toggleAction,
}: {
  rates: any[];
  setTf: (value: string) => void;
  tf: string;
  toggleAction: any;
}) {
  const [rateToView, setRateToView] = useState<RateToView>(RateToView.Average);

  const rates = useMemo(() => {
    if (!data.length) {
      return {};
    }

    const lowRates = data.map((d) => d[1] * 100 * 365);
    const averageRates = data.map((d) => d[2] * 100 * 365);
    const highRates = data.map((d) => d[3] * 100 * 365);

    return {
      lowRates,
      averageRates,
      highRates,
    };
  }, [data]);

  const viewingRates = useMemo(() => {
    switch (rateToView) {
      case RateToView.Average:
        return rates.averageRates;
      case RateToView.High:
        return rates.highRates;
      case RateToView.Low:
        return rates.lowRates;
    }
  }, [rateToView, rates]);

  const ratesText = useMemo(() => {
    switch (rateToView) {
      case RateToView.Average:
        return "Average";
      case RateToView.High:
        return "High";
      case RateToView.Low:
        return "Low";
    }
  }, [rateToView]);

  const [offset, setOffset] = useState(0);
  const windowSize = 90;

  const moveBackward = useCallback(() => {
    if (offset + windowSize === data.length) {
      return;
    }

    setOffset(offset + 1);
  }, [offset, data]);

  const moveForward = useCallback(() => {
    if (offset <= 0) {
      return;
    }

    setOffset(offset - 1);
  }, [offset]);

  const chartToView = useMemo(() => {
    const ratesToPlot = viewingRates?.slice(offset, offset + windowSize).reverse() || [];

    if (!ratesToPlot.length) {
      return null;
    }

    return asciichart.plot([ratesToPlot], {
      padding: "        ",
      height: 16,
    });
  }, [rates, offset, windowSize, viewingRates]);

  const toDate = useMemo(() => {
    if (!data.length) {
      return "";
    }

    return new Date(data[offset][0]).toLocaleString();
  }, [data, offset]);

  const fromDate = useMemo(() => {
    if (!data.length) {
      return "";
    }

    return new Date(data[offset + windowSize - 1][0]).toLocaleString();
  }, [data, offset, windowSize]);

  const dateString = useMemo(() => {
    if (!data.length) {
      return "";
    }

    return `From **\`${fromDate}\`** to **\`${toDate}\`**`;
  }, [toDate, fromDate]);

  return (
    <Detail
      actions={
        <ActionPanel>
          {toggleAction}

          <ActionPanel.Submenu title="Set Viewing Rates" icon={Icon.Gauge}>
            <Action title="High Rates" onAction={() => setRateToView(RateToView.High)} />
            <Action title="Average Rates" onAction={() => setRateToView(RateToView.Average)} />
            <Action title="Low Rates" onAction={() => setRateToView(RateToView.Low)} />
          </ActionPanel.Submenu>

          <LendingRatesSubMenu onChange={setTf} />

          <Action
            title="Previous Time Frame"
            icon={Icon.ChevronLeft}
            onAction={moveBackward}
            shortcut={{
              modifiers: ["cmd", "shift"],
              key: "arrowLeft",
            }}
          />

          <Action
            title="Next Time Frame"
            icon={Icon.ChevronRight}
            onAction={moveForward}
            shortcut={{
              modifiers: ["cmd", "shift"],
              key: "arrowRight",
            }}
          />
        </ActionPanel>
      }
      isLoading={!chartToView}
      markdown={
        chartToView
          ? `## ${ratesText} Lending Rates by ${tfKeyToLabel[tf]}
${dateString}
\`\`\`
${chartToView}
\`\`\`
`
          : ""
      }
    />
  );
}
