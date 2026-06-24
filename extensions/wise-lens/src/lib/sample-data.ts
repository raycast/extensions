import { summarizeActivities, inferPrimaryCurrency } from "./summarize";
import { BalanceWithDisplay, DashboardSnapshot, Prefs, WiseActivity, WiseBalance } from "./types";

const RATES_FROM_EUR: Record<string, number> = {
  EUR: 1,
  USD: 1.0853,
  GBP: 0.8534,
  THB: 38.1245,
  JPY: 169.42,
  CHF: 0.9521,
};

function sampleBalances(): WiseBalance[] {
  return [
    { id: 1001, currency: "EUR", amount: { value: 2547.83, currency: "EUR" }, type: "STANDARD" },
    { id: 1002, currency: "USD", amount: { value: 340.12, currency: "USD" }, type: "STANDARD" },
    { id: 1004, currency: "CHF", amount: { value: 0, currency: "CHF" }, type: "STANDARD" },
    { id: 2001, currency: "EUR", amount: { value: 1250.0, currency: "EUR" }, type: "SAVINGS", name: "Travel Fund" },
    { id: 2002, currency: "EUR", amount: { value: 3500.0, currency: "EUR" }, type: "SAVINGS", name: "Emergency Fund" },
  ];
}

interface SampleTxSpec {
  daysAgo: number;
  hour: number;
  minute: number;
  type: "CARD_PAYMENT" | "TRANSFER" | "REFUND";
  status?: "COMPLETED" | "PENDING" | "CANCELLED";
  title: string;
  description?: string;
  primary: { amount: number; currency: string };
  secondary?: { amount: number; currency: string };
}

const TX_SPECS: SampleTxSpec[] = [
  {
    daysAgo: 0,
    hour: 14,
    minute: 23,
    type: "CARD_PAYMENT",
    title: "Starbucks",
    primary: { amount: -4.85, currency: "EUR" },
  },
  {
    daysAgo: 0,
    hour: 9,
    minute: 12,
    type: "CARD_PAYMENT",
    title: "Mercadona",
    primary: { amount: -38.42, currency: "EUR" },
  },
  {
    daysAgo: 1,
    hour: 20,
    minute: 5,
    type: "CARD_PAYMENT",
    title: "Netflix",
    description: "Subscription",
    primary: { amount: -15.99, currency: "EUR" },
  },
  {
    daysAgo: 1,
    hour: 13,
    minute: 47,
    type: "CARD_PAYMENT",
    title: "Uber",
    primary: { amount: -12.5, currency: "EUR" },
  },
  {
    daysAgo: 2,
    hour: 19,
    minute: 30,
    type: "CARD_PAYMENT",
    title: "Restaurant Sakura",
    primary: { amount: -52.4, currency: "EUR" },
  },
  {
    daysAgo: 2,
    hour: 11,
    minute: 20,
    type: "TRANSFER",
    title: "Salary received",
    description: "Sent by Acme Corp",
    primary: { amount: 2800.0, currency: "EUR" },
  },
  {
    daysAgo: 3,
    hour: 22,
    minute: 14,
    type: "CARD_PAYMENT",
    title: "Amazon",
    primary: { amount: -29.99, currency: "EUR" },
  },
  {
    daysAgo: 3,
    hour: 16,
    minute: 8,
    type: "CARD_PAYMENT",
    title: "Apple Store",
    primary: { amount: -9.99, currency: "USD" },
    secondary: { amount: -9.21, currency: "EUR" },
  },
  {
    daysAgo: 4,
    hour: 10,
    minute: 45,
    type: "CARD_PAYMENT",
    title: "Lidl",
    primary: { amount: -23.15, currency: "EUR" },
  },
  {
    daysAgo: 5,
    hour: 17,
    minute: 30,
    type: "TRANSFER",
    title: "Sent to John Doe",
    primary: { amount: -120.0, currency: "EUR" },
  },
  {
    daysAgo: 6,
    hour: 12,
    minute: 0,
    type: "CARD_PAYMENT",
    title: "Spotify",
    description: "Premium",
    primary: { amount: -10.99, currency: "EUR" },
  },
  {
    daysAgo: 6,
    hour: 8,
    minute: 5,
    type: "CARD_PAYMENT",
    title: "Bus ticket",
    primary: { amount: -2.5, currency: "EUR" },
  },
  {
    daysAgo: 7,
    hour: 21,
    minute: 50,
    type: "CARD_PAYMENT",
    title: "Tesco",
    primary: { amount: -18.4, currency: "GBP" },
    secondary: { amount: -21.55, currency: "EUR" },
  },
  {
    daysAgo: 8,
    hour: 14,
    minute: 5,
    type: "CARD_PAYMENT",
    title: "Pret a Manger",
    primary: { amount: -7.8, currency: "GBP" },
    secondary: { amount: -9.14, currency: "EUR" },
  },
  {
    daysAgo: 8,
    hour: 9,
    minute: 30,
    type: "TRANSFER",
    title: "Top up from bank account",
    description: "Received from BBVA",
    primary: { amount: 500.0, currency: "EUR" },
  },
  {
    daysAgo: 9,
    hour: 18,
    minute: 25,
    type: "REFUND",
    title: "Refund from Zara",
    primary: { amount: 24.95, currency: "EUR" },
  },
  {
    daysAgo: 10,
    hour: 13,
    minute: 0,
    type: "CARD_PAYMENT",
    title: "Bike repair",
    primary: { amount: -45.0, currency: "EUR" },
  },
  {
    daysAgo: 11,
    hour: 11,
    minute: 15,
    type: "CARD_PAYMENT",
    title: "Coffee Lab",
    primary: { amount: -3.6, currency: "EUR" },
  },
  {
    daysAgo: 12,
    hour: 19,
    minute: 40,
    type: "CARD_PAYMENT",
    title: "Cinema",
    primary: { amount: -19.0, currency: "EUR" },
  },
  {
    daysAgo: 14,
    hour: 16,
    minute: 10,
    type: "CARD_PAYMENT",
    title: "Pharmacy",
    primary: { amount: -11.25, currency: "EUR" },
  },
  {
    daysAgo: 15,
    hour: 12,
    minute: 30,
    type: "CARD_PAYMENT",
    title: "Carrefour",
    primary: { amount: -67.9, currency: "EUR" },
  },
  {
    daysAgo: 16,
    hour: 20,
    minute: 0,
    type: "CARD_PAYMENT",
    title: "Pizza place",
    primary: { amount: -32.5, currency: "EUR" },
  },
  {
    daysAgo: 17,
    hour: 10,
    minute: 0,
    type: "CARD_PAYMENT",
    title: "Gym membership",
    description: "Monthly",
    primary: { amount: -39.99, currency: "EUR" },
  },
  {
    daysAgo: 18,
    hour: 14,
    minute: 22,
    type: "CARD_PAYMENT",
    title: "Notion",
    description: "Annual plan",
    primary: { amount: -96.0, currency: "USD" },
    secondary: { amount: -88.41, currency: "EUR" },
  },
  {
    daysAgo: 20,
    hour: 15,
    minute: 0,
    type: "TRANSFER",
    title: "Sent to Mom",
    primary: { amount: -200.0, currency: "EUR" },
  },
  {
    daysAgo: 21,
    hour: 11,
    minute: 30,
    type: "CARD_PAYMENT",
    title: "Coffee",
    primary: { amount: -2.8, currency: "EUR" },
  },
  {
    daysAgo: 22,
    hour: 19,
    minute: 15,
    type: "CARD_PAYMENT",
    title: "Sushi delivery",
    primary: { amount: -28.5, currency: "EUR" },
  },
  {
    daysAgo: 23,
    hour: 13,
    minute: 45,
    type: "CARD_PAYMENT",
    title: "Bookstore",
    primary: { amount: -22.0, currency: "EUR" },
  },
  {
    daysAgo: 24,
    hour: 9,
    minute: 0,
    type: "TRANSFER",
    title: "Rent",
    description: "Sent to Landlord",
    primary: { amount: -850.0, currency: "EUR" },
  },
  {
    daysAgo: 25,
    hour: 17,
    minute: 50,
    type: "CARD_PAYMENT",
    title: "Train ticket",
    primary: { amount: -45.6, currency: "EUR" },
  },
  {
    daysAgo: 27,
    hour: 21,
    minute: 0,
    type: "CARD_PAYMENT",
    title: "Hotel Bangkok",
    primary: { amount: -2450.0, currency: "THB" },
    secondary: { amount: -64.27, currency: "EUR" },
  },
  {
    daysAgo: 28,
    hour: 12,
    minute: 0,
    type: "CARD_PAYMENT",
    title: "Street food",
    primary: { amount: -180.0, currency: "THB" },
    secondary: { amount: -4.72, currency: "EUR" },
  },
  {
    daysAgo: 30,
    hour: 10,
    minute: 0,
    type: "TRANSFER",
    title: "Top up from bank account",
    description: "Received from BBVA",
    primary: { amount: 1000.0, currency: "EUR" },
  },
  {
    daysAgo: 32,
    hour: 16,
    minute: 30,
    type: "CARD_PAYMENT",
    title: "Pharmacy",
    primary: { amount: -8.5, currency: "EUR" },
  },
  {
    daysAgo: 35,
    hour: 14,
    minute: 12,
    type: "CARD_PAYMENT",
    title: "Hairdresser",
    primary: { amount: -35.0, currency: "EUR" },
  },
  {
    daysAgo: 38,
    hour: 11,
    minute: 45,
    type: "CARD_PAYMENT",
    title: "iCloud Storage",
    primary: { amount: -2.99, currency: "USD" },
    secondary: { amount: -2.75, currency: "EUR" },
  },
  {
    daysAgo: 42,
    hour: 19,
    minute: 0,
    type: "CARD_PAYMENT",
    title: "Concert tickets",
    primary: { amount: -85.0, currency: "EUR" },
  },
];

function formatAmount(value: number, currency: string): string {
  // Mirror Wise's activity format: a <positive>/<negative> tag with a signed amount,
  // so sample data exercises the same direction/parse path as the real API.
  const tag = value < 0 ? "negative" : "positive";
  const sign = value < 0 ? "-" : "+";
  return `<${tag}>${sign} ${Math.abs(value).toFixed(2)} ${currency}</${tag}>`;
}

function specToActivity(spec: SampleTxSpec, id: number): WiseActivity {
  const date = new Date();
  date.setDate(date.getDate() - spec.daysAgo);
  date.setHours(spec.hour, spec.minute, 0, 0);
  return {
    type: spec.type,
    status: spec.status ?? "COMPLETED",
    description: spec.description ?? spec.title,
    title: spec.title,
    primaryAmount: formatAmount(spec.primary.amount, spec.primary.currency),
    secondaryAmount: spec.secondary ? formatAmount(spec.secondary.amount, spec.secondary.currency) : undefined,
    createdOn: date.toISOString(),
    resource: { type: spec.type, id: 9000 + id },
  };
}

export async function buildSampleSnapshot(prefs: Prefs): Promise<DashboardSnapshot> {
  const balances = sampleBalances();
  const activities = TX_SPECS.map((s, i) => specToActivity(s, i)).sort(
    (a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
  );

  const displayCurrency = prefs.displayCurrency || "EUR";
  const ratesByPair = new Map<string, { source: string; target: string; rate: number }>();

  const rateTo = (src: string, tgt: string): number | null => {
    if (src === tgt) return 1;
    const srcToEur = src === "EUR" ? 1 : RATES_FROM_EUR[src] ? 1 / RATES_FROM_EUR[src] : null;
    const eurToTgt = tgt === "EUR" ? 1 : (RATES_FROM_EUR[tgt] ?? null);
    if (srcToEur == null || eurToTgt == null) return null;
    return srcToEur * eurToTgt;
  };

  const withDisplay: BalanceWithDisplay[] = balances.map((b) => {
    if (b.currency === displayCurrency) return { ...b, displayEquiv: b.amount.value };
    if (Math.abs(b.amount.value) < 0.005) return { ...b, displayEquiv: 0 };
    const r = rateTo(b.currency, displayCurrency);
    if (r != null) {
      ratesByPair.set(`${b.currency}->${displayCurrency}`, {
        source: b.currency,
        target: displayCurrency,
        rate: r,
      });
      return { ...b, displayEquiv: b.amount.value * r };
    }
    return { ...b, displayEquiv: undefined };
  });

  let sum = 0;
  let partial = false;
  for (const w of withDisplay) {
    if (w.displayEquiv == null) partial = true;
    else sum += w.displayEquiv;
  }
  const total = prefs.displayCurrency ? { value: sum, currency: displayCurrency, partial } : undefined;

  let fxRate: DashboardSnapshot["fxRate"];
  if (prefs.displayCurrency && prefs.fxTargetCurrency && prefs.displayCurrency !== prefs.fxTargetCurrency) {
    const r = rateTo(prefs.displayCurrency, prefs.fxTargetCurrency);
    if (r != null) {
      fxRate = { source: prefs.displayCurrency, target: prefs.fxTargetCurrency, rate: r };
      ratesByPair.set(`${prefs.displayCurrency}->${prefs.fxTargetCurrency}`, {
        source: prefs.displayCurrency,
        target: prefs.fxTargetCurrency,
        rate: r,
      });
    }
  }

  const summaryCurrency = prefs.displayCurrency || inferPrimaryCurrency(activities);
  const summary = await summarizeActivities(activities, summaryCurrency, (from, to) => rateTo(from, to), 8);

  return {
    profileId: 1234567,
    balances: withDisplay,
    total,
    summary,
    activities,
    fxRate,
    usedRates: Array.from(ratesByPair.values()),
    fetchedAt: Date.now(),
  };
}
