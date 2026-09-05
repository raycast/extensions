import { Action, ActionPanel, Detail, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { BASE_URL } from "./api";

interface CalcInfo {
  id: string;
  title: string;
  subtitle: string;
  icon: Icon;
}

const CALCULATORS: CalcInfo[] = [
  {
    id: "kelly",
    title: "Kelly Stake Sizing",
    subtitle: "How much to bet given your edge",
    icon: Icon.Coins,
  },
  {
    id: "hedge",
    title: "Hedge Calculator",
    subtitle: "Lock in profit on an open bet",
    icon: Icon.Shield,
  },
  {
    id: "edge",
    title: "De-Vig Edge Check",
    subtitle: "Is your price beating the fair line?",
    icon: Icon.Gauge,
  },
  {
    id: "free-bet",
    title: "Free Bet Converter",
    subtitle: "Turn a free bet into guaranteed cash",
    icon: Icon.BankNote,
  },
];

export default function LineCalculatorsCommand() {
  return (
    <List searchBarPlaceholder="Pick a calculator">
      {CALCULATORS.map((calc) => (
        <List.Item
          key={calc.id}
          icon={calc.icon}
          title={calc.title}
          subtitle={calc.subtitle}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.ArrowRight} title="Open Calculator" target={<CalcForm id={calc.id} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CalcForm({ id }: { id: string }) {
  switch (id) {
    case "kelly":
      return <KellyForm />;
    case "hedge":
      return <HedgeForm />;
    case "edge":
      return <EdgeForm />;
    default:
      return <FreeBetForm />;
  }
}

const ODDS_INFO = "American (-110, +250) or decimal (1.91) odds both work";

async function runCalc(path: string, params: Record<string, string>): Promise<Record<string, unknown> | undefined> {
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${BASE_URL}${path}?${qs}`);
    const body = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const detail = body?.detail as Record<string, unknown> | undefined;
      const message =
        (detail?.message as string) ?? (body?.message as string) ?? `Request failed with status ${res.status}`;
      await showToast({ style: Toast.Style.Failure, title: "Calculation failed", message });
      return undefined;
    }
    return body;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Network error",
      message: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

function num(value: unknown): string {
  return typeof value === "number" ? `${Math.round(value * 100) / 100}` : `${value}`;
}

function usd(value: unknown): string {
  return typeof value === "number" ? `$${(Math.round(value * 100) / 100).toFixed(2)}` : `${value}`;
}

function resultDetail(title: string, rows: [string, string][], note?: string, copyText?: string) {
  const md = [
    `# ${title}`,
    "",
    "| | |",
    "| --- | --- |",
    ...rows.map(([k, v]) => `| ${k} | **${v}** |`),
    ...(note ? ["", `> ${note}`] : []),
  ].join("\n");
  return (
    <Detail
      markdown={md}
      navigationTitle={title}
      actions={
        <ActionPanel>
          {copyText && <Action.CopyToClipboard title="Copy Result" content={copyText} />}
          <Action.OpenInBrowser title="Open Documentation" url={`${BASE_URL}/docs`} />
        </ActionPanel>
      }
    />
  );
}

function KellyForm() {
  const { push } = useNavigation();
  const [loading, setLoading] = useState(false);

  async function submit(values: { bankroll: string; odds: string; winProb: string; fraction: string }) {
    setLoading(true);
    const data = await runCalc("/v1/calc/kelly", {
      bankroll: values.bankroll.trim(),
      odds: values.odds.trim(),
      win_prob: values.winProb.trim(),
      fraction: values.fraction,
    });
    setLoading(false);
    if (!data) return;
    push(
      resultDetail(
        "Kelly Stake",
        [
          ["Recommended stake", usd(data.kelly_stake_usd)],
          ["Kelly fraction (applied)", num(data.kelly_fraction_applied)],
          ["Full Kelly fraction", num(data.kelly_fraction_full)],
          ["Edge vs implied", num(data.edge_vs_implied)],
          ["Expected value", usd(data.expected_value_usd)],
          ["Positive EV", data.is_plus_ev ? "Yes" : "No"],
        ],
        typeof data.note === "string" ? data.note : undefined,
        `Kelly stake: ${usd(data.kelly_stake_usd)} (${num(data.kelly_fraction_applied)} of bankroll)`,
      ),
    );
  }

  return (
    <Form
      isLoading={loading}
      navigationTitle="Kelly Stake Sizing"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Calculator} title="Calculate Stake" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="bankroll" title="Bankroll (USD)" placeholder="1000" />
      <Form.TextField id="odds" title="Odds" placeholder="-110" info={ODDS_INFO} />
      <Form.TextField
        id="winProb"
        title="Win Probability"
        placeholder="0.55"
        info="Your estimated chance of winning, from 0 to 1"
      />
      <Form.Dropdown id="fraction" title="Kelly Fraction" defaultValue="0.25">
        <Form.Dropdown.Item value="0.25" title="Quarter Kelly (conservative)" />
        <Form.Dropdown.Item value="0.5" title="Half Kelly" />
        <Form.Dropdown.Item value="1.0" title="Full Kelly (high variance)" />
      </Form.Dropdown>
    </Form>
  );
}

function HedgeForm() {
  const { push } = useNavigation();
  const [loading, setLoading] = useState(false);

  async function submit(values: { stake: string; originalOdds: string; hedgeOdds: string; target: string }) {
    setLoading(true);
    const data = await runCalc("/v1/calc/hedge", {
      original_stake: values.stake.trim(),
      original_odds: values.originalOdds.trim(),
      hedge_odds: values.hedgeOdds.trim(),
      target: values.target,
    });
    setLoading(false);
    if (!data) return;
    push(
      resultDetail(
        "Hedge",
        [
          ["Hedge stake", usd(data.hedge_stake_usd)],
          ["Total staked", usd(data.total_stake_usd)],
          ["Profit if original wins", usd(data.profit_if_original_wins)],
          ["Profit if hedge wins", usd(data.profit_if_hedge_wins)],
          ["Guaranteed profit", usd(data.guaranteed_profit_usd)],
          ["True arbitrage", data.is_arb ? "Yes" : "No"],
        ],
        typeof data.note === "string" ? data.note : undefined,
        `Hedge ${usd(data.hedge_stake_usd)} to lock ${usd(data.guaranteed_profit_usd)}`,
      ),
    );
  }

  return (
    <Form
      isLoading={loading}
      navigationTitle="Hedge Calculator"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Calculator} title="Calculate Hedge" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="stake" title="Original Stake (USD)" placeholder="100" />
      <Form.TextField id="originalOdds" title="Original Odds" placeholder="+300" info={ODDS_INFO} />
      <Form.TextField id="hedgeOdds" title="Hedge Odds" placeholder="-150" info={ODDS_INFO} />
      <Form.Dropdown id="target" title="Target" defaultValue="equal_profit">
        <Form.Dropdown.Item value="equal_profit" title="Equal Profit Both Sides" />
        <Form.Dropdown.Item value="free_roll" title="Free Roll (no downside)" />
      </Form.Dropdown>
    </Form>
  );
}

function EdgeForm() {
  const { push } = useNavigation();
  const [loading, setLoading] = useState(false);

  async function submit(values: {
    odds: string;
    trueProb: string;
    sharpOver: string;
    sharpUnder: string;
    stake: string;
  }) {
    const trueProb = values.trueProb.trim();
    const sharpOver = values.sharpOver.trim();
    const sharpUnder = values.sharpUnder.trim();
    if (!trueProb && (!sharpOver || !sharpUnder)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing input",
        message: "Enter a true probability, or both sides of a sharp market",
      });
      return;
    }
    const params: Record<string, string> = { odds: values.odds.trim() };
    if (trueProb) params.true_prob = trueProb;
    if (sharpOver && sharpUnder) {
      params.sharp_over_odds = sharpOver;
      params.sharp_under_odds = sharpUnder;
    }
    if (values.stake.trim()) params.stake = values.stake.trim();
    setLoading(true);
    const data = await runCalc("/v1/calc/edge", params);
    setLoading(false);
    if (!data) return;
    push(
      resultDetail(
        "Edge Check",
        [
          ["Edge", `${num(data.edge_pct)}%`],
          ["Positive EV", data.is_plus_ev ? "Yes" : "No"],
          ["Your implied probability", num(data.odds_implied_prob)],
          ["Fair probability (no vig)", num(data.fair_prob)],
          ["Fair price (American)", num(data.fair_american)],
          ["Expected value", usd(data.expected_value_usd)],
        ],
        typeof data.note === "string" ? data.note : undefined,
        `Edge: ${num(data.edge_pct)}% (${data.is_plus_ev ? "+EV" : "-EV"}) vs fair ${num(data.fair_american)}`,
      ),
    );
  }

  return (
    <Form
      isLoading={loading}
      navigationTitle="De-Vig Edge Check"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Calculator} title="Check Edge" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="odds" title="Your Odds" placeholder="-105" info={ODDS_INFO} />
      <Form.Description text="Provide either your own win probability, or both sides of a sharp book's market to strip the vig." />
      <Form.TextField id="trueProb" title="True Probability" placeholder="0.55 (optional)" />
      <Form.TextField id="sharpOver" title="Sharp Side A Odds" placeholder="-110 (optional)" />
      <Form.TextField id="sharpUnder" title="Sharp Side B Odds" placeholder="-110 (optional)" />
      <Form.TextField id="stake" title="Stake (USD)" placeholder="100" />
    </Form>
  );
}

function FreeBetForm() {
  const { push } = useNavigation();
  const [loading, setLoading] = useState(false);

  async function submit(values: { amount: string; betOdds: string; hedgeOdds: string }) {
    setLoading(true);
    const data = await runCalc("/v1/calc/free-bet", {
      free_bet_usd: values.amount.trim(),
      bet_odds: values.betOdds.trim(),
      hedge_odds: values.hedgeOdds.trim(),
    });
    setLoading(false);
    if (!data) return;
    push(
      resultDetail(
        "Free Bet Conversion",
        [
          ["Hedge stake", usd(data.hedge_stake_usd)],
          ["Guaranteed cash", usd(data.guaranteed_cash_usd)],
          ["Conversion rate", `${num(data.conversion_pct)}%`],
          ["Profit if free bet wins", usd(data.profit_if_free_bet_wins)],
          ["Profit if hedge wins", usd(data.profit_if_hedge_wins)],
        ],
        typeof data.note === "string" ? data.note : undefined,
        `Free bet converts to ${usd(data.guaranteed_cash_usd)} guaranteed (${num(data.conversion_pct)}%)`,
      ),
    );
  }

  return (
    <Form
      isLoading={loading}
      navigationTitle="Free Bet Converter"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Calculator} title="Convert Free Bet" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="amount" title="Free Bet Amount (USD)" placeholder="100" />
      <Form.TextField id="betOdds" title="Free Bet Odds" placeholder="+300" info={ODDS_INFO} />
      <Form.TextField id="hedgeOdds" title="Hedge Odds" placeholder="-140" info={ODDS_INFO} />
    </Form>
  );
}
