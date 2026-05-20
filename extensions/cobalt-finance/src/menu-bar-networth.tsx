import {
  Color,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  showHUD,
} from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

import { authorize, logout } from "./oauth";

interface NetWorthResponse {
  totals: {
    checking: number;
    savings: number;
    investments: number;
    credit: number;
    loans: number;
    assets: number;
    liabilities: number;
    netWorth: number;
  };
  history: { date: string; value: number }[];
  asOf: string | null;
}

const usdCompact = new Intl.NumberFormat("en-US", {
  compactDisplay: "short",
  currency: "USD",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency",
});

const usdFull = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  style: "currency",
});

const dateDisplay = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const BLUR = "••••";

function formatTitle(value: number, blurred: boolean): string {
  if (blurred) {
    return BLUR;
  }
  return Math.abs(value) >= 10_000
    ? usdCompact.format(value)
    : usdFull.format(value);
}

function formatFull(value: number, blurred: boolean): string {
  return blurred ? BLUR : usdFull.format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? iso : dateDisplay.format(new Date(t));
}

function formatDelta(delta: number, blurred: boolean): string {
  if (blurred) {
    return BLUR;
  }
  let sign = "";
  if (delta > 0) {
    sign = "+";
  } else if (delta < 0) {
    sign = "−";
  }
  return `${sign}${usdFull.format(Math.abs(delta))}`;
}

function deltaIcon(delta: number): { source: Icon; tintColor: Color } {
  if (delta > 0) {
    return { source: Icon.ArrowUp, tintColor: Color.Green };
  }
  if (delta < 0) {
    return { source: Icon.ArrowDown, tintColor: Color.Red };
  }
  return { source: Icon.Minus, tintColor: Color.SecondaryText };
}

function useAccessToken(
  base: string,
): [string | null, (t: string | null) => void] {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    const run = async () => {
      try {
        const token = await authorize(base);
        setAccessToken(token);
      } catch (error) {
        showFailureToast(error, { title: "Sign-in failed" });
      }
    };
    void run();
  }, [base]);
  return [accessToken, setAccessToken];
}

interface Deltas {
  latest: number;
  dayDelta: number;
  monthDelta: number;
  hasDayDelta: boolean;
}

function computeDeltas(
  totals: NetWorthResponse["totals"] | undefined,
  history: { date: string; value: number }[],
): Deltas {
  const latest = history.at(-1)?.value ?? totals?.netWorth ?? 0;
  const prior = history.at(-2)?.value ?? latest;
  const monthStart = history[0]?.value ?? latest;
  return {
    dayDelta: latest - prior,
    hasDayDelta: history.length > 1,
    latest,
    monthDelta: latest - monthStart,
  };
}

function ContentSections({
  data,
  blurred,
}: {
  data: NetWorthResponse | undefined;
  blurred: boolean;
}) {
  if (!data?.totals) {
    return null;
  }
  const deltas = computeDeltas(data.totals, data.history);
  return (
    <>
      <HeaderSection
        asOf={data.asOf}
        blurred={blurred}
        dayDelta={deltas.dayDelta}
        hasDayDelta={deltas.hasDayDelta}
        monthDelta={deltas.monthDelta}
        totals={data.totals}
      />
      <AssetsSection blurred={blurred} totals={data.totals} />
      <LiabilitiesSection blurred={blurred} totals={data.totals} />
    </>
  );
}

function ActionsSection({
  blurred,
  revalidate,
  toggleBlur,
  signOut,
}: {
  blurred: boolean;
  revalidate: () => void;
  toggleBlur: () => void;
  signOut: () => void;
}) {
  return (
    <MenuBarExtra.Section>
      <MenuBarExtra.Item
        icon={Icon.Globe}
        shortcut={{ key: "o", modifiers: ["cmd"] }}
        title="Open Cobalt"
        onAction={() => {
          void open("https://app.usecobalt.com");
        }}
      />
      <MenuBarExtra.Item
        icon={Icon.ArrowClockwise}
        shortcut={{ key: "r", modifiers: ["cmd"] }}
        title="Refresh"
        onAction={revalidate}
      />
      <MenuBarExtra.Item
        icon={blurred ? Icon.Eye : Icon.EyeDisabled}
        shortcut={{ key: "h", modifiers: ["cmd"] }}
        title={blurred ? "Show Amounts" : "Hide Amounts"}
        onAction={toggleBlur}
      />
      <MenuBarExtra.Item
        icon={Icon.Logout}
        shortcut={{ key: "l", modifiers: ["cmd", "shift"] }}
        title="Sign Out"
        onAction={signOut}
      />
    </MenuBarExtra.Section>
  );
}

function HeaderSection({
  totals,
  asOf,
  blurred,
  dayDelta,
  monthDelta,
  hasDayDelta,
}: {
  totals: NetWorthResponse["totals"];
  asOf: string | null;
  blurred: boolean;
  dayDelta: number;
  monthDelta: number;
  hasDayDelta: boolean;
}) {
  return (
    <MenuBarExtra.Section title="Net Worth">
      <MenuBarExtra.Item
        icon={{ source: Icon.BankNote, tintColor: Color.Green }}
        subtitle={formatDate(asOf)}
        title={formatFull(totals.netWorth, blurred)}
        onAction={() => {
          void launchCommand({
            name: "networth",
            type: LaunchType.UserInitiated,
          });
        }}
      />
      {hasDayDelta ? (
        <MenuBarExtra.Item
          icon={deltaIcon(dayDelta)}
          title={`Day · ${formatDelta(dayDelta, blurred)}`}
        />
      ) : null}
      <MenuBarExtra.Item
        icon={deltaIcon(monthDelta)}
        title={`Month · ${formatDelta(monthDelta, blurred)}`}
      />
    </MenuBarExtra.Section>
  );
}

function AssetsSection({
  totals,
  blurred,
}: {
  totals: NetWorthResponse["totals"];
  blurred: boolean;
}) {
  return (
    <MenuBarExtra.Section title="Assets">
      <MenuBarExtra.Item
        icon={{ source: Icon.PlusCircle, tintColor: Color.Green }}
        subtitle={formatFull(totals.assets, blurred)}
        title="Total"
      />
      <MenuBarExtra.Item
        icon={{ source: Icon.Wallet, tintColor: Color.Blue }}
        subtitle={formatFull(totals.checking, blurred)}
        title="Checking"
      />
      <MenuBarExtra.Item
        icon={{ source: Icon.Coin, tintColor: Color.Purple }}
        subtitle={formatFull(totals.savings, blurred)}
        title="Savings"
      />
      <MenuBarExtra.Item
        icon={{ source: Icon.LineChart, tintColor: Color.SecondaryText }}
        subtitle={formatFull(totals.investments, blurred)}
        title="Investments"
      />
    </MenuBarExtra.Section>
  );
}

function LiabilitiesSection({
  totals,
  blurred,
}: {
  totals: NetWorthResponse["totals"];
  blurred: boolean;
}) {
  return (
    <MenuBarExtra.Section title="Liabilities">
      <MenuBarExtra.Item
        icon={{ source: Icon.MinusCircle, tintColor: Color.Red }}
        subtitle={formatFull(totals.liabilities, blurred)}
        title="Total"
      />
      <MenuBarExtra.Item
        icon={{ source: Icon.CreditCard, tintColor: Color.Magenta }}
        subtitle={formatFull(totals.credit, blurred)}
        title="Credit"
      />
      <MenuBarExtra.Item
        icon={{ source: Icon.BankNote, tintColor: Color.Orange }}
        subtitle={formatFull(totals.loans, blurred)}
        title="Loans"
      />
    </MenuBarExtra.Section>
  );
}

export default function Command() {
  const { apiUrl } = getPreferenceValues<Preferences>();
  const base = (apiUrl || "https://api.cobaltpf.com").replace(/\/+$/, "");
  const [accessToken, setAccessToken] = useAccessToken(base);
  const [blurred, setBlurred] = useState(false);

  const { isLoading, data, revalidate, error } = useFetch(
    `${base}/v1/networth?range=1M`,
    {
      execute: !!accessToken,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      keepPreviousData: true,
      mapResult(result: NetWorthResponse) {
        return { data: result };
      },
    },
  );

  const signOut = async () => {
    await logout();
    setAccessToken(null);
    await showHUD("Signed out of Cobalt");
  };

  const title = data?.totals ? formatTitle(data.totals.netWorth, blurred) : "—";

  return (
    <MenuBarExtra
      icon={{ source: Icon.BankNote, tintColor: Color.Green }}
      isLoading={isLoading || !accessToken}
      title={title}
      tooltip={`Cobalt net worth · ${formatDate(data?.asOf ?? null)}`}
    >
      {error ? (
        <MenuBarExtra.Item
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          subtitle={error.message}
          title="Failed to load"
          onAction={revalidate}
        />
      ) : null}
      <ContentSections blurred={blurred} data={data} />
      <ActionsSection
        blurred={blurred}
        revalidate={revalidate}
        signOut={signOut}
        toggleBlur={() => setBlurred((b) => !b)}
      />
    </MenuBarExtra>
  );
}
