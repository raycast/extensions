import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";

interface FormValues {
  capital: string;
  risk: string;
  type: "long" | "short";
  leverage: string;
  entry: string;
  stop: string;
  exit: string;
}

export default function TradeCalculator() {
  const [capital, setCapital] = useState<string>("");
  const [risk, setRisk] = useState<string>("");
  const [leverage, setLeverage] = useState<string>("10");
  const [entry, setEntry] = useState<string>("");
  const [stop, setStop] = useState<string>("");
  const [exit, setExit] = useState<string>("");

  const { push } = useNavigation();

  async function handleSubmit(values: FormValues) {
    push(<Result {...values} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          <Action
            title="Reset"
            onAction={() => {
              setCapital("");
              setRisk("");
              setLeverage("10");
              setEntry("");
              setStop("");
              setExit("");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="capital"
        title="Total Capital ($)"
        info="The total amount of capital in your trading account."
        placeholder={""}
        value={capital}
        onChange={(newValue) => {
          const value = newValue.replace(/[^0-9.]/g, "");
          setCapital(value);
        }}
      />

      <Form.TextField
        id="risk"
        title="Risk (%)"
        info="The percentage of your total capital you are willing to risk in this trade."
        placeholder={""}
        value={risk}
        onChange={(newValue) => {
          const value = newValue.replace(/[^0-9.]/g, "");
          setRisk(value);
        }}
      />

      <Form.Separator />

      <Form.Dropdown
        id="type"
        title="Type"
        info={
          "Longs are a buying position that enables the trader to profit if the price of an asset increases. Shorts are a selling position that enables a trader to profit if the price of an asset decreases."
        }
        defaultValue="long"
      >
        <Form.Dropdown.Item value="long" title="Long" icon={Icon.ChevronUp} />
        <Form.Dropdown.Item value="short" title="Short" icon={Icon.ChevronDown} />
      </Form.Dropdown>

      <Form.TextField
        id="leverage"
        title="Leverage"
        info="The proportion of your trade that will be paid for with borrowed funds. If you are using 2x leverage, you will be funding half of the trade. If you are using 25x leverage you will be funding 1/25 of the trade."
        placeholder={""}
        value={leverage}
        onChange={(newValue) => {
          const value = newValue.replace(/[^0-9.]/g, "");
          setLeverage(value);
        }}
      />

      <Form.TextField
        id="entry"
        title="Entry ($)"
        info="The price at which you enter the trade."
        placeholder={"$"}
        value={entry}
        onChange={(newValue) => {
          const value = newValue.replace(/[^0-9.]/g, "");
          setEntry(value);
        }}
      />
      <Form.TextField
        id="stop"
        title="Stop ($)"
        info="A price level you can set on a position which will, once reached, close the position and prevent any further loss."
        placeholder={"$"}
        value={stop}
        onChange={(newValue) => {
          const value = newValue.replace(/[^0-9.]/g, "");
          setStop(value);
        }}
      />
      <Form.TextField
        id="exit"
        title="Exit ($)"
        info='The price at which you exit your trade. Can be referred to as your take profit or "TP"'
        placeholder={"$"}
        value={exit}
        onChange={(newValue) => {
          const value = newValue.replace(/[^0-9.]/g, "");
          setExit(value);
        }}
      />
    </Form>
  );
}

function Result(values: FormValues) {
  const capital = Number(values.capital);
  const risk = Number(values.risk);
  // const type = values.type
  const leverage = Number(values.leverage);
  const entry = Number(values.entry);
  const stop = Number(values.stop);
  const exit = Number(values.exit);

  const riskedCapital = () => {
    if (capital && risk) {
      const value = capital * (risk / 100);
      return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
    } else {
      return "-";
    }
  };

  const positionSize = () => {
    if (capital && risk && entry && stop) {
      const risked_capital = capital * (risk / 100);
      const value = risked_capital / (entry - stop);
      return value.toLocaleString();
    } else {
      return "-";
    }
  };

  const margin = () => {
    if (capital && risk && entry && stop && leverage) {
      const risked_capital = capital * (risk / 100);
      const positionSize = risked_capital / (entry - stop);
      const value = (positionSize * entry) / leverage;
      return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
    } else {
      return "-";
    }
  };

  const pnl = () => {
    if (capital && risk && entry && stop && leverage && exit) {
      const risked_capital = capital * (risk / 100);
      const positionSize = risked_capital / (entry - stop);
      const value = positionSize * (exit - entry);
      return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
    } else {
      return "-";
    }
  };

  const riskReward = () => {
    if (capital && risk && entry && stop && leverage && exit) {
      const risked_capital = capital * (risk / 100);
      const positionSize = risked_capital / (entry - stop);
      const pnl = positionSize * (exit - entry);
      const value = pnl / risked_capital;
      return value.toLocaleString();
    } else {
      return "-";
    }
  };

  const roe = () => {
    if (capital && risk && entry && stop && leverage && exit) {
      const risked_capital = capital * (risk / 100);
      const positionSize = risked_capital / (entry - stop);
      const margin = (positionSize * entry) / leverage;
      const pnl = positionSize * (exit - entry);
      const value = (pnl / margin) * 100;
      return `${value.toLocaleString()}%`;
    } else {
      return "-";
    }
  };

  const markdown = `\
  # WORK IN PROGRESS EXTENSION
  
| Stat             | Amount          |
| ---------------- | --------------- |
| Risked Capital   | ${riskedCapital()}           |
| Margin           | ${margin()}                  |
| Position Size    | ${positionSize()}            |
| Liquidation      | N/A            |
| Risk / Reward    | ${riskReward()}            |
| Estimated PnL    | ${pnl()}             |
| ROE              | ${roe()}            |
| Percent Change   | N/A            |
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Pikachu"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Capital" text={"$2,352"} />

          <Detail.Metadata.Label title="Risk" text="2.34%" />

          <Detail.Metadata.Separator />

          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item text="Long" color="green" icon={Icon.ChevronUp} />
            <Detail.Metadata.TagList.Item text="Short" color="red" icon={Icon.ChevronDown} />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Label title="Leverage" text={"10x"} />

          <Detail.Metadata.Label title="Entry" text="$62,567.32" />

          <Detail.Metadata.Label title="Stop" text={"$62,127.53"} />

          <Detail.Metadata.Label title="Exit" text="$65,340.32" />

          <Detail.Metadata.Link title="Journal" target="https://tradeloop.app/" text="TradeLoop" />
        </Detail.Metadata>
      }
    />
  );
}
