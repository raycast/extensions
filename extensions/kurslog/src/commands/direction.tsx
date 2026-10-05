import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  Form,
  useNavigation,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { useAllRates } from "../hooks/useAllRates";
import {
  useFavoriteExchangers,
  useBlacklistExchangers,
} from "../hooks/useFavorites";
import { paramDescriptions } from "../utils/locale";
import {
  formatNumber,
  formatRateDisplay,
  formatCalculation,
} from "../utils/format";
import { directionUrl, exchangerUrl, redirectUrl } from "../utils/url";
import {
  mapTrustColor,
  trustStatusOrder,
  trustStatusName,
  trustStatusIcon,
} from "../utils/trustStatus";
import {
  toggleFavoriteExchanger,
  toggleBlacklistExchanger,
} from "../utils/favorites";
import type { RateItem } from "../api/types";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

type SortOption = "bestRate" | "rating" | "favorites";

interface DirectionViewProps {
  from: string;
  to: string;
  amount?: number;
  cityUrl?: string;
}

export default function DirectionView({
  from,
  to,
  amount: initialAmount,
  cityUrl,
}: DirectionViewProps) {
  const {
    data: rates,
    isLoading,
    error,
    revalidate,
  } = useAllRates(from, to, cityUrl);
  const { data: favExchangers, revalidate: revalidateFavs } =
    useFavoriteExchangers();
  const { data: blacklist, revalidate: revalidateBlacklist } =
    useBlacklistExchangers();
  const [sortBy, setSortBy] = useState<SortOption>("bestRate");
  const [amount, setAmount] = useState<number | undefined>(initialAmount);
  const { push } = useNavigation();

  const favs = favExchangers || [];
  const blocked = blacklist || [];

  const sortedRates = useMemo(() => {
    if (!rates) return [];
    const filtered = rates.filter(
      (r) => !blocked.includes(r.exchanger_internal_url),
    );
    const withState = filtered.map((r) => {
      let isDisabled = false;
      if (amount) {
        if (r.min_amount && amount < r.min_amount) isDisabled = true;
        if (r.max_amount && amount > r.max_amount) isDisabled = true;
      }
      return { ...r, isDisabled };
    });
    // NaN-safe rate ratio
    function safeRate(r: { rate_out: number; rate_in: number }): number {
      if (!r.rate_in || !r.rate_out) return 0;
      const v = r.rate_out / r.rate_in;
      return isNaN(v) || !isFinite(v) ? 0 : v;
    }

    withState.sort((a, b) => {
      // Disabled always at bottom
      if (a.isDisabled !== b.isDisabled) return a.isDisabled ? 1 : -1;

      let diff: number;
      switch (sortBy) {
        case "bestRate":
          diff = safeRate(b) - safeRate(a);
          if (diff !== 0) return diff;
          diff =
            trustStatusOrder(b.trust_status_css_class) -
            trustStatusOrder(a.trust_status_css_class);
          if (diff !== 0) return diff;
          // Stable tiebreaker
          return a.exchanger_id - b.exchanger_id;

        case "rating":
          diff =
            (b.exchanger_trust_score_total ?? 0) -
            (a.exchanger_trust_score_total ?? 0);
          if (diff !== 0) return diff;
          return safeRate(b) - safeRate(a) || a.exchanger_id - b.exchanger_id;

        case "favorites": {
          const aF = favs.includes(a.exchanger_internal_url) ? 1 : 0;
          const bF = favs.includes(b.exchanger_internal_url) ? 1 : 0;
          if (aF !== bF) return bF - aF;
          diff = safeRate(b) - safeRate(a);
          if (diff !== 0) return diff;
          return a.exchanger_id - b.exchanger_id;
        }
        default:
          return 0;
      }
    });
    return withState;
  }, [rates, sortBy, favs, blocked, amount]);

  async function handleToggleFav(url: string) {
    const added = await toggleFavoriteExchanger(url);
    await showToast({
      style: Toast.Style.Success,
      title: added ? "★" : "☆",
    });
    revalidateFavs();
  }

  async function handleToggleBlacklist(url: string) {
    const added = await toggleBlacklistExchanger(url);
    await showToast({
      style: Toast.Style.Success,
      title: added ? "Hidden" : "Visible",
    });
    revalidateBlacklist();
  }

  function parseParams(params?: string): string[] {
    if (!params) return [];
    return params
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  }

  /** Build markdown that mimics the web rate card layout */
  function buildCardMarkdown(rate: RateItem & { isDisabled: boolean }): string {
    const trustLabel =
      rate.trust_status_label || trustStatusName(rate.trust_status_css_class);
    const params = parseParams(rate.params);
    const explanationClean = rate.trust_status_explanation
      ? stripHtml(rate.trust_status_explanation)
      : "";

    // Rate display
    const ratio = rate.rate_out / rate.rate_in;
    let rateBlock: string;
    if (amount) {
      const total = (amount * rate.rate_out) / rate.rate_in;
      rateBlock = `${formatNumber(amount)} ${rate.from_currency_name} =\n\n# ${formatNumber(total)} ${rate.to_currency_name}`;
    } else if (ratio >= 0.1) {
      rateBlock = `1 ${rate.from_currency_name} =\n\n# ${formatNumber(ratio)} ${rate.to_currency_name}`;
    } else {
      const inv = rate.rate_in / rate.rate_out;
      rateBlock = `# ${formatNumber(inv)} ${rate.from_currency_name}\n\n= 1 ${rate.to_currency_name}`;
    }

    // Exchanger name (bold, like web 700 weight)
    const isFav = favs.includes(rate.exchanger_internal_url);
    const favMark = isFav ? " ❤️" : "";
    let md = `**${rate.exchanger_name}**${favMark}  \n`;

    // Star rating
    md += `★ ${rate.exchanger_rating?.toFixed(1) ?? "—"}`;

    // Trust status
    if (trustLabel) {
      md += `  ·  ${trustLabel}`;
    }

    // Params
    if (params.length > 0) {
      const paramNames = params
        .map((p) => paramDescriptions[p] || p)
        .join(", ");
      md += `  ·  ${paramNames}`;
    }

    md += "\n\n---\n\n";

    // Rate (big, like web rate-value-big 20px 800 weight)
    md += rateBlock;

    md += "\n\n---\n\n";

    // Limits (like web card-bottom)
    const minText = rate.min_amount
      ? `${formatNumber(rate.min_amount)} ${rate.from_currency_name}`
      : "—";
    const maxText = rate.max_amount
      ? `${formatNumber(rate.max_amount)} ${rate.from_currency_name}`
      : "∞";
    md += `Min amount: **${minText}**  \n`;
    md += `Max amount: **${maxText}**`;

    if (rate.reserves) {
      md += `  \nReserves: **${formatNumber(rate.reserves)} ${rate.to_currency_name}**`;
    }

    if (amount) {
      const rateForOne = formatRateDisplay(
        rate.rate_in,
        rate.rate_out,
        rate.from_currency_name,
        rate.to_currency_name,
      );
      md += `  \nRate: ${rateForOne}`;
    }

    // Trust explanation
    if (explanationClean) {
      md += `\n\n---\n\n*${explanationClean}*`;
    }

    return md;
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search exchangers..."
      navigationTitle={`${from.toUpperCase()} → ${to.toUpperCase()}`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          value={sortBy}
          onChange={(v) => setSortBy(v as SortOption)}
        >
          <List.Dropdown.Item title="Best Rate" value="bestRate" />
          <List.Dropdown.Item title="Rating" value="rating" />
          <List.Dropdown.Item title="Favorites" value="favorites" />
        </List.Dropdown>
      }
    >
      {error && !isLoading ? (
        <List.EmptyView
          title="Could not load rates"
          description={
            error instanceof Error
              ? error.message
              : "Please try refreshing the command."
          }
          icon={Icon.XMarkCircle}
        />
      ) : null}
      {sortedRates.length === 0 && !isLoading && !error && (
        <List.EmptyView title="No rates available" icon={Icon.XMarkCircle} />
      )}
      {sortedRates.map((rate, rateIndex) => {
        const isFav = favs.includes(rate.exchanger_internal_url);
        const trustLabel =
          rate.trust_status_label ||
          trustStatusName(rate.trust_status_css_class);
        const trustColor = mapTrustColor(rate.trust_status_css_class);
        const trustIcon = trustStatusIcon(rate.trust_status_css_class);
        const explanationClean = rate.trust_status_explanation
          ? stripHtml(rate.trust_status_explanation)
          : "";

        return (
          <List.Item
            key={`${rate.exchanger_id}-${rate.id}`}
            title={rate.exchanger_name}
            accessories={[
              ...(trustLabel
                ? [
                    {
                      tag: { value: trustLabel, color: trustColor },
                      icon: trustIcon,
                      tooltip: explanationClean || trustLabel,
                    },
                  ]
                : []),
              ...(isFav
                ? [
                    {
                      icon: { source: Icon.Heart, tintColor: Color.Red },
                    },
                  ]
                : []),
            ]}
            detail={<List.Item.Detail markdown={buildCardMarkdown(rate)} />}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Exchange"
                  url={redirectUrl({
                    from,
                    to,
                    exchangerId: rate.exchanger_id,
                    amount,
                    position: rateIndex,
                    cityUrl,
                    sort:
                      sortBy === "bestRate"
                        ? "best_rate"
                        : sortBy === "rating"
                          ? "trust_score"
                          : "favorites",
                  })}
                  icon={Icon.ArrowRight}
                />
                <Action.OpenInBrowser
                  title="Open on Kurslog"
                  url={directionUrl(from, to)}
                  icon={Icon.Link}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.OpenInBrowser
                  title="Open Exchanger Page"
                  url={exchangerUrl(rate.exchanger_internal_url)}
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action.CopyToClipboard
                  title="Copy Rate"
                  content={
                    amount
                      ? formatCalculation(
                          amount,
                          rate.rate_in,
                          rate.rate_out,
                          rate.from_currency_name,
                          rate.to_currency_name,
                        )
                      : formatRateDisplay(
                          rate.rate_in,
                          rate.rate_out,
                          rate.from_currency_name,
                          rate.to_currency_name,
                        )
                  }
                />
                <Action
                  title={isFav ? "Remove Favorite" : "Add Favorite"}
                  icon={isFav ? Icon.HeartDisabled : Icon.Heart}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                  onAction={() => handleToggleFav(rate.exchanger_internal_url)}
                />
                <Action
                  title="Hide Exchanger"
                  icon={Icon.EyeDisabled}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                  onAction={() =>
                    handleToggleBlacklist(rate.exchanger_internal_url)
                  }
                />
                <Action
                  title="Enter Amount"
                  icon={Icon.Calculator}
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
                  onAction={() =>
                    push(
                      <AmountForm
                        fromName={from.toUpperCase()}
                        onSubmit={(v) => setAmount(v)}
                      />,
                    )
                  }
                />
                <Action.Push
                  title="Swap Currencies"
                  icon={Icon.Switch}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  target={
                    <DirectionView
                      from={to}
                      to={from}
                      amount={amount}
                      cityUrl={cityUrl}
                    />
                  }
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function AmountForm({
  fromName,
  onSubmit,
}: {
  fromName: string;
  onSubmit: (amount: number) => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Enter Amount"
            onSubmit={(values) => {
              const val = parseFloat(values.amount);
              if (!isNaN(val) && val > 0) onSubmit(val);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="amount"
        title={`Amount (${fromName})`}
        placeholder="1000"
      />
    </Form>
  );
}
