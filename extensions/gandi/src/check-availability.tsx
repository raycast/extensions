/* eslint-disable @typescript-eslint/no-explicit-any */
import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { usePromise } from "@raycast/utils";
import * as gandiAPI from "./api";
import type { DomainAvailability } from "./types";

// Very light validation: "name.tld" (at least one dot, no spaces)
const looksLikeDomain = (s: string) => /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(s.trim());

type LowestPrices = { after: number | null; before: number | null };

// Helpers to reason about prices and taxes
const normalizeTaxRate = (rate: unknown): number => {
  const r = typeof rate === "number" ? rate : Number(rate);
  if (!Number.isFinite(r)) return 0;
  // API may return percent (e.g., 20) or fraction (e.g., 0.2). Treat > 1.5 as percent.
  return r > 1.5 ? r / 100 : r;
};

const getTaxRate = (a: DomainAvailability | null) => {
  if (!a?.taxes || a.taxes.length === 0) return 0;
  return a.taxes.reduce((sum, t) => sum + normalizeTaxRate(t.rate), 0);
};

const getLowestPrices = (a: DomainAvailability | null): LowestPrices => {
  const priceList: any[] = a?.products?.flatMap((p: any) => (Array.isArray(p?.prices) ? p.prices : [])) ?? [];
  if (priceList.length === 0) return { after: null, before: null };
  const afterVals = priceList.map((p) => (typeof p?.price_after_taxes === "number" ? p.price_after_taxes : Infinity));
  const beforeVals = priceList.map((p) =>
    typeof p?.price_before_taxes === "number" ? p.price_before_taxes : Infinity,
  );
  const after = Math.min(...afterVals);
  const before = Math.min(...beforeVals);
  return { after: Number.isFinite(after) ? after : null, before: Number.isFinite(before) ? before : null };
};

// Lowest prices restricted to a specific product process (e.g., create, renew)
const getLowestPricesForProcess = (a: DomainAvailability | null, process: string): LowestPrices => {
  const pro = (process || "").toLowerCase();
  const priceList: any[] =
    a?.products
      ?.filter((p: any) => (p?.process || p?.action || "").toLowerCase() === pro)
      ?.flatMap((p: any) => (Array.isArray(p?.prices) ? p.prices : [])) ?? [];
  if (priceList.length === 0) return { after: null, before: null };
  const afterVals = priceList.map((p) => (typeof p?.price_after_taxes === "number" ? p.price_after_taxes : Infinity));
  const beforeVals = priceList.map((p) =>
    typeof p?.price_before_taxes === "number" ? p.price_before_taxes : Infinity,
  );
  const after = Math.min(...afterVals);
  const before = Math.min(...beforeVals);
  return { after: Number.isFinite(after) ? after : null, before: Number.isFinite(before) ? before : null };
};

const humanizeSectionTitle = (process?: string): string => {
  const p = String(process || "").toLowerCase();
  if (p === "create") return "First year (registration)";
  if (p === "renew") return "Renewal (after first year)";
  if (p === "transfer") return "Transfer";
  return (process || "PRICING").toString().replace(/_/g, " ");
};

const humanizeItemTitle = (process: string | undefined, price: any): string => {
  const p = String(process || "").toLowerCase();
  const unit = String(price?.duration_unit || "year");
  const min = Number(price?.min_duration ?? 1);
  const max = Number(price?.max_duration ?? min);
  const plural = (n: number) => (n > 1 ? "s" : "");
  if (p === "create") {
    if (unit === "year" && min === 1 && max === 1) return "First year";
    if (unit === "year" && min === 1 && max > 1) return `First years (1–${max} years)`;
    return `Registration (${min} ${unit}${plural(min)}${max !== min ? ` to ${max} ${unit}${plural(max)}` : ""})`;
  }
  if (p === "renew") {
    if (unit === "year" && min === 1 && max === 1) return "Renewal (per year)";
    return `Renewal (${min} ${unit}${plural(min)}${max !== min ? ` to ${max} ${unit}${plural(max)}` : ""})`;
  }
  if (p === "transfer") {
    return "Transfer";
  }
  // Fallback: generic duration
  return `${min} ${unit}${plural(min)}`;
};

// Detect price unit scale: API typically returns cents (e.g., 1234 => 12.34), but some responses may
// appear in micro-units (e.g., 1234000). We'll infer the divider so a value displays in a sane range [0.5, 9999].
const detectDivider = (priceMinor: number | null): number => {
  if (priceMinor == null) return 100; // default cents
  const candidates = [1, 100, 1000, 1000000]; // raw, cents, permille, micro
  // Pick divider giving display in [0.5, 9999]
  let best = 100;
  for (const d of candidates) {
    const v = priceMinor / d;
    if (v >= 0.5 && v <= 9999) return d;
    // Keep closest to range as fallback
    if (Math.abs(v - 50) < Math.abs(priceMinor / best - 50)) best = d;
  }
  return best;
};

const buildExactAccessories = (
  availability: DomainAvailability,
  lowest: LowestPrices,
  totalTaxRate: number,
  formatPrice: (price: number, currency: string) => string,
): List.Item.Accessory[] => {
  const acc: List.Item.Accessory[] = [
    {
      tag: {
        value: availability.available ? "Available" : "Taken",
        color: availability.available ? Color.Green : Color.Red,
      },
    },
  ];
  if (!availability.available || !availability.currency) return acc;
  // Prefer first-year (create) pricing for the headline
  const firstYear = getLowestPricesForProcess(availability, "create");
  const headline = firstYear.after ?? firstYear.before ?? lowest.after ?? lowest.before;
  const headlineIsAfter = firstYear.after != null || (firstYear.before == null && lowest.after != null);
  if (typeof headline === "number") {
    const prefix = firstYear.after != null || firstYear.before != null ? "First year" : "From";
    const taxLabel = headlineIsAfter ? "(incl. taxes)" : "(excl. taxes)";
    acc.push({
      text: `${prefix} ${formatPrice(headline, availability.currency)} ${taxLabel}`.trim(),
      icon: Icon.Coins,
    });
    if (!headlineIsAfter && totalTaxRate > 0) {
      const approxIncl = Math.round(headline * (1 + totalTaxRate));
      acc.push({ text: `≈ ${formatPrice(approxIncl, availability.currency)} (incl. taxes)`, icon: Icon.Receipt });
    }
  } else {
    acc.push({ text: "Pricing unavailable", icon: Icon.Info });
  }
  return acc;
};

function PricingSections({
  availability,
  formatPrice,
}: Readonly<{ availability: DomainAvailability; formatPrice: (n: number, c: string) => string }>) {
  if (!Array.isArray(availability.products) || availability.products.length === 0) return null;
  return (
    <>
      {availability.products.map((product: any) => {
        const prices = Array.isArray(product?.prices) ? product.prices : [];
        const sectionTitle = humanizeSectionTitle(product.process || product.action);
        return (
          <List.Section key={`product-${product.action}`} title={sectionTitle || "PRICING"}>
            {prices.length === 0 ? (
              <List.Item icon={Icon.Info} title="Pricing not available" subtitle="No price data returned" />
            ) : (
              prices.map((price: any) => (
                <List.Item
                  key={`${product.action}-${price.duration_unit}-${price.min_duration}-${price.max_duration}`}
                  icon={Icon.Coins}
                  title={humanizeItemTitle(product.process || product.action, price)}
                  subtitle={price.discount ? "Discounted" : ""}
                  accessories={
                    [
                      typeof price.price_after_taxes === "number" && availability.currency
                        ? {
                            text: `Incl. taxes ${formatPrice(price.price_after_taxes, availability.currency)}`,
                            icon: Icon.Tag,
                          }
                        : undefined,
                      typeof price.price_before_taxes === "number" && availability.currency
                        ? {
                            text: `Excl. taxes ${formatPrice(price.price_before_taxes, availability.currency)}`,
                            icon: Icon.Receipt,
                          }
                        : undefined,
                      typeof price.max_duration === "number" && price.max_duration !== price.min_duration
                        ? { text: `Max: ${price.max_duration} ${price.duration_unit}s`, icon: Icon.Calendar }
                        : undefined,
                    ].filter(Boolean) as List.Item.Accessory[]
                  }
                />
              ))
            )}
          </List.Section>
        );
      })}
    </>
  );
}

function AlternativesSection({
  altData,
  formatPrice,
}: Readonly<{
  altData: Array<{ domain: string; availability: DomainAvailability | null }>;
  formatPrice: (n: number, c: string) => string;
}>) {
  if (!Array.isArray(altData) || altData.length === 0) return null;
  return (
    <List.Section title="Alternatives">
      {altData.map(({ domain, availability: alt }) => {
        const { iconSource, tintColor, accessories } = buildAlternativePresentation(alt, formatPrice);
        return (
          <List.Item
            key={`alt-${domain}`}
            title={domain}
            icon={{ source: iconSource, tintColor }}
            accessories={accessories}
            actions={
              <ActionPanel>
                {alt?.available && (
                  <Action.OpenInBrowser
                    title="Register Domain"
                    url={`https://shop.gandi.net/domain/suggest?search=${encodeURIComponent(domain)}`}
                    icon={Icon.Globe}
                  />
                )}
                <Action.CopyToClipboard title="Copy Domain" content={domain} />
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}

// TaxesSection was intentionally removed from the UI to reduce confusion.

function buildAlternativePresentation(
  alt: DomainAvailability | null,
  formatPrice: (n: number, c: string) => string,
): { iconSource: Icon; tintColor?: Color; accessories: List.Item.Accessory[] } {
  const accessories: List.Item.Accessory[] = [];
  if (!alt) {
    accessories.push({ tag: { value: "Unknown", color: Color.SecondaryText } });
    return { iconSource: Icon.QuestionMark, tintColor: Color.SecondaryText, accessories };
  }
  const iconSource = alt.available ? Icon.CheckCircle : Icon.XMarkCircle;
  const tintColor = alt.available ? Color.Green : Color.Red;
  accessories.push({ tag: { value: alt.available ? "Available" : "Taken", color: tintColor } });
  if (alt.available && alt.currency) {
    const altFirst = getLowestPricesForProcess(alt, "create");
    const altLowest = getLowestPrices(alt);
    const altTaxRate = getTaxRate(alt);
    const headline = altFirst.after ?? altFirst.before ?? altLowest.after ?? altLowest.before;
    const isAfter = altFirst.after != null || (altFirst.before == null && altLowest.after != null);
    if (typeof headline === "number") {
      const label = altFirst.after != null || altFirst.before != null ? "First year" : "From";
      const taxLabel = isAfter ? "(incl. taxes)" : "(excl. taxes)";
      accessories.push({
        text: `${label} ${formatPrice(headline, alt.currency)} ${taxLabel}`.trim(),
        icon: Icon.Coins,
      });
      if (!isAfter && altTaxRate > 0) {
        const approxInclAlt = Math.round(headline * (1 + altTaxRate));
        accessories.push({ text: `≈ ${formatPrice(approxInclAlt, alt.currency)} (incl. taxes)`, icon: Icon.Receipt });
      }
    }
  }
  return { iconSource, tintColor, accessories };
}

export default function CheckAvailability() {
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");

  // Debounce query updates to avoid hammering the API while typing
  useEffect(() => {
    const id = setTimeout(() => setQuery(searchText.trim()), 400);
    return () => clearTimeout(id);
  }, [searchText]);

  const hasQuery = query.length > 0;
  const isValid = looksLikeDomain(query);

  const { data, isLoading } = usePromise(
    async (name: string) => {
      try {
        return await gandiAPI.checkAvailability(name);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to check availability",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
      }
    },
    [query],
    { execute: hasQuery && isValid },
  );

  const availability: DomainAvailability | null = data as DomainAvailability | null;

  const formatPrice = useMemo(() => {
    // Determine divider based on lowest available price
    const lowestNow = getLowestPrices(availability);
    const divider = detectDivider(lowestNow.after ?? lowestNow.before);
    return (priceMinor: number, currency: string) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(priceMinor / divider);
  }, [availability]);

  const lowest = getLowestPrices(availability);
  const totalTaxRate = getTaxRate(availability);

  // Build alternative TLD suggestions
  const COMMON_TLDS = useMemo(() => ["com", "net", "org", "io", "co", "dev", "app", "xyz", "me", "ai"], []);

  const { sld, tld } = useMemo(() => {
    const lower = query.toLowerCase();
    const idx = lower.indexOf(".");
    if (idx === -1) return { sld: "", tld: "" };
    return { sld: lower.slice(0, idx), tld: lower.slice(idx + 1) };
  }, [query]);

  const altDomains = useMemo(() => {
    if (!sld) return [] as string[];
    return COMMON_TLDS.filter((x) => x !== tld)
      .map((x) => `${sld}.${x}`)
      .slice(0, 10);
  }, [sld, tld, COMMON_TLDS]);

  type AltResult = { domain: string; availability: DomainAvailability | null };
  const { data: altData } = usePromise(
    async (domains: string[]) => {
      if (altDomains.length === 0) return [] as AltResult[];
      const results = await Promise.allSettled(
        domains.map(async (d) => {
          try {
            const a = await gandiAPI.checkAvailability(d);
            return { domain: d, availability: a } as AltResult;
          } catch {
            return { domain: d, availability: null } as AltResult;
          }
        }),
      );
      return results.map((r) => (r.status === "fulfilled" ? r.value : null)).filter(Boolean) as AltResult[];
    },
    [altDomains],
    { execute: hasQuery && isValid },
  );

  // Early returns for clarity
  if (!hasQuery) {
    return (
      <List
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Type a domain (e.g., example.com)"
      >
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Check domain availability"
          description="Start typing a domain like example.com"
        />
      </List>
    );
  }

  if (!isValid) {
    return (
      <List
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Type a domain (e.g., example.com)"
      >
        <List.EmptyView icon={Icon.Info} title="Enter a full domain" description="Include a TLD, e.g., example.com" />
      </List>
    );
  }

  if (!availability) {
    return (
      <List
        searchText={searchText}
        onSearchTextChange={setSearchText}
        isLoading={isLoading}
        searchBarPlaceholder="Type a domain (e.g., example.com)"
      >
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Checking…" />
      </List>
    );
  }

  const accessories = buildExactAccessories(availability, lowest, totalTaxRate, formatPrice);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type a domain (e.g., example.com)"
    >
      <List.Section title="Exact Match">
        <List.Item
          icon={{
            source: availability.available ? Icon.CheckCircle : Icon.XMarkCircle,
            tintColor: availability.available ? Color.Green : Color.Red,
          }}
          title={query}
          accessories={accessories}
          actions={
            <ActionPanel>
              {availability.available && (
                <Action.OpenInBrowser
                  title="Register Domain"
                  url={`https://shop.gandi.net/domain/suggest?search=${encodeURIComponent(query)}`}
                  icon={Icon.Globe}
                />
              )}
              <Action.CopyToClipboard title="Copy Domain" content={query} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            </ActionPanel>
          }
        />
      </List.Section>

      {!!availability.products?.length && <PricingSections availability={availability} formatPrice={formatPrice} />}

      {!!altData?.length && <AlternativesSection altData={altData} formatPrice={formatPrice} />}
      {/* Taxes section removed */}
    </List>
  );
}
