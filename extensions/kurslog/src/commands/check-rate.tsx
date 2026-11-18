import {
  Form,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { useCurrencies } from "../hooks/useCurrencies";
import { usePairs } from "../hooks/usePairs";
import { formatNumber } from "../utils/format";
import { currencyIcon } from "../utils/icon";
import {
  fetchCountries,
  fetchCities,
  fetchTopRates,
  type Country,
  type City,
} from "../api/client";
import type { Currency, Tag } from "../api/types";
import DirectionView from "./direction";

function isCash(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes("cash") && lower !== "bitcoin-cash";
}

export default function CheckRate() {
  const { data: currencies, isLoading: currLoading } = useCurrencies();
  const { data: pairs, isLoading: pairsLoading } = usePairs();
  const { push } = useNavigation();

  const [fromUrl, setFromUrl] = useState("");
  const [toUrl, setToUrl] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [activeField, setActiveField] = useState<"from" | "to">("from");

  // Best rate for auto-calculation
  const [bestRateIn, setBestRateIn] = useState(0);
  const [bestRateOut, setBestRateOut] = useState(0);

  // Cash: country & city
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [countryId, setCountryId] = useState("");
  const [cityUrl, setCityUrl] = useState("");

  const isCashDirection = useMemo(
    () => isCash(fromUrl) || isCash(toUrl),
    [fromUrl, toUrl],
  );

  // Group currencies by tags for dropdown sections
  const fromSections = useMemo(() => {
    if (!currencies) return [];
    return buildTagSections(
      currencies.filter((c) => c.has_rates),
      "from",
    );
  }, [currencies]);

  const toSections = useMemo(() => {
    if (!currencies || !pairs || !fromUrl) return [];
    const available = new Set<string>();
    for (const p of pairs) {
      if (p.from === fromUrl) available.add(p.to);
    }
    return buildTagSections(
      currencies.filter((c) => c.has_rates && available.has(c.url)),
      "to",
    );
  }, [currencies, pairs, fromUrl]);

  // Fetch best rate when both currencies selected
  useEffect(() => {
    if (!fromUrl || !toUrl) {
      setBestRateIn(0);
      setBestRateOut(0);
      return;
    }
    fetchTopRates(fromUrl, toUrl, 1)
      .then((rates) => {
        if (rates.length > 0) {
          setBestRateIn(rates[0].rate_in);
          setBestRateOut(rates[0].rate_out);
        } else {
          setBestRateIn(0);
          setBestRateOut(0);
        }
      })
      .catch(() => {
        setBestRateIn(0);
        setBestRateOut(0);
      });
  }, [fromUrl, toUrl]);

  // Auto-calculate: when FROM amount changes → calculate TO
  useEffect(() => {
    if (activeField !== "from" || !bestRateIn || !bestRateOut) return;
    const val = parseFloat(fromAmount.replace(/\s/g, ""));
    if (!isNaN(val) && val > 0) {
      const result = (val * bestRateOut) / bestRateIn;
      setToAmount(formatNumber(result));
    } else {
      setToAmount("");
    }
  }, [fromAmount, bestRateIn, bestRateOut, activeField]);

  // Auto-calculate: when TO amount changes → calculate FROM
  useEffect(() => {
    if (activeField !== "to" || !bestRateIn || !bestRateOut) return;
    const val = parseFloat(toAmount.replace(/\s/g, ""));
    if (!isNaN(val) && val > 0) {
      const result = (val * bestRateIn) / bestRateOut;
      setFromAmount(formatNumber(result));
    } else {
      setFromAmount("");
    }
  }, [toAmount, bestRateIn, bestRateOut, activeField]);

  // Fetch countries for cash directions
  useEffect(() => {
    if (!isCashDirection || !fromUrl || !toUrl) {
      setCountries([]);
      setCities([]);
      return;
    }
    fetchCountries(fromUrl, toUrl)
      .then((data) => {
        setCountries(data);
        const ua = data.find((c) => c.code === "UA");
        setCountryId(
          ua ? String(ua.id) : data.length > 0 ? String(data[0].id) : "",
        );
      })
      .catch(() => setCountries([]));
  }, [isCashDirection, fromUrl, toUrl]);

  // Fetch cities
  useEffect(() => {
    if (!isCashDirection || !fromUrl || !toUrl || !countryId) {
      setCities([]);
      setCityUrl("");
      return;
    }
    fetchCities(fromUrl, toUrl, Number(countryId))
      .then((data) => {
        setCities(data);
        if (data.length > 0) setCityUrl(data[0].url);
      })
      .catch(() => setCities([]));
  }, [isCashDirection, fromUrl, toUrl, countryId]);

  function handleSwap() {
    if (pairs?.some((p) => p.from === toUrl && p.to === fromUrl)) {
      const oldFrom = fromUrl;
      const oldTo = toUrl;
      const oldFromAmt = fromAmount;
      const oldToAmt = toAmount;
      setFromUrl(oldTo);
      setToUrl(oldFrom);
      setFromAmount(oldToAmt);
      setToAmount(oldFromAmt);
    } else {
      showToast({ style: Toast.Style.Failure, title: "No rates available" });
    }
  }

  function handleSubmit() {
    if (!fromUrl || !toUrl) {
      showToast({
        style: Toast.Style.Failure,
        title: "Select both currencies",
      });
      return;
    }
    const val = parseFloat(fromAmount.replace(/\s/g, ""));
    const amount = !isNaN(val) && val > 0 ? val : undefined;
    const city = isCashDirection && cityUrl ? cityUrl : undefined;
    push(
      <DirectionView
        from={fromUrl}
        to={toUrl}
        amount={amount}
        cityUrl={city}
      />,
    );
  }

  // Rate info text
  const rateInfo = useMemo(() => {
    if (!bestRateIn || !bestRateOut || !fromUrl || !toUrl) return "";
    const fromCur = currencies?.find((c) => c.url === fromUrl);
    const toCur = currencies?.find((c) => c.url === toUrl);
    const fromName = fromCur ? fromCur.currency_name : fromUrl.toUpperCase();
    const toName = toCur ? toCur.currency_name : toUrl.toUpperCase();
    const ratio = bestRateOut / bestRateIn;
    if (ratio >= 0.1) {
      return `Best Rate: 1 ${fromName} ≈ ${formatNumber(ratio)} ${toName}`;
    }
    return `Best Rate: ${formatNumber(bestRateIn / bestRateOut)} ${fromName} ≈ 1 ${toName}`;
  }, [bestRateIn, bestRateOut, fromUrl, toUrl, currencies]);

  return (
    <Form
      isLoading={currLoading || pairsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Check Rates"
            icon={Icon.MagnifyingGlass}
            onSubmit={handleSubmit}
          />
          <Action
            title="Swap Currencies"
            icon={Icon.Switch}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={handleSwap}
          />
        </ActionPanel>
      }
    >
      {/* FROM currency with tag sections */}
      <Form.Dropdown
        id="from"
        title="You give"
        value={fromUrl}
        onChange={(v) => {
          setFromUrl(v);
          setToUrl("");
          setFromAmount("");
          setToAmount("");
        }}
      >
        <Form.Dropdown.Item title="—" value="" />
        {fromSections.map((section) => (
          <Form.Dropdown.Section
            key={String(section.tag.id)}
            title={section.tag.name_en}
          >
            {section.currencies.map((c) => (
              <Form.Dropdown.Item
                key={c.url}
                title={`${c.name_en} (${c.url.toUpperCase()})`}
                value={c.url}
                icon={currencyIcon(c.icon_img)}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>

      {/* FROM amount */}
      <Form.TextField
        id="fromAmount"
        title="Amount"
        placeholder="1000"
        value={fromAmount}
        onChange={(v) => {
          setActiveField("from");
          setFromAmount(v);
        }}
      />

      {/* TO currency with tag sections */}
      <Form.Dropdown id="to" title="You get" value={toUrl} onChange={setToUrl}>
        <Form.Dropdown.Item title="—" value="" />
        {toSections.map((section) => (
          <Form.Dropdown.Section
            key={String(section.tag.id)}
            title={section.tag.name_en}
          >
            {section.currencies.map((c) => (
              <Form.Dropdown.Item
                key={c.url}
                title={`${c.name_en} (${c.url.toUpperCase()})`}
                value={c.url}
                icon={currencyIcon(c.icon_img)}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>

      {/* TO amount (auto-calculated) */}
      <Form.TextField
        id="toAmount"
        title="Amount"
        placeholder="You get"
        value={toAmount}
        onChange={(v) => {
          setActiveField("to");
          setToAmount(v);
        }}
      />

      {/* Best rate info */}
      {rateInfo ? <Form.Description title="Rate" text={rateInfo} /> : null}

      {/* Country & City for cash directions */}
      {isCashDirection && countries.length > 0 && (
        <>
          <Form.Separator />
          <Form.Dropdown
            id="country"
            title="Country"
            value={countryId}
            onChange={(v) => {
              setCountryId(v);
              setCityUrl("");
            }}
          >
            {countries.map((c) => (
              <Form.Dropdown.Item
                key={String(c.id)}
                title={c.name_en}
                value={String(c.id)}
              />
            ))}
          </Form.Dropdown>
          {cities.length > 0 && (
            <Form.Dropdown
              id="city"
              title="City"
              value={cityUrl}
              onChange={setCityUrl}
            >
              {cities.map((c) => (
                <Form.Dropdown.Item
                  key={c.url}
                  title={c.name_en}
                  value={c.url}
                />
              ))}
            </Form.Dropdown>
          )}
        </>
      )}
    </Form>
  );
}

/** Group currencies by their first tag into sections */
function buildTagSections(
  items: Currency[],
  mode: "from" | "to",
): { tag: Tag; currencies: Currency[] }[] {
  const sortField = mode === "from" ? "popularity_from" : "popularity_to";
  const sorted = [...items].sort(
    (a, b) => (b[sortField] ?? 0) - (a[sortField] ?? 0),
  );

  const tagMap = new Map<string, { tag: Tag; currencies: Currency[] }>();
  const noTag: Currency[] = [];

  for (const cur of sorted) {
    if (cur.tags && cur.tags.length > 0) {
      const tag = cur.tags[0];
      const key = String(tag.id);
      if (!tagMap.has(key)) {
        tagMap.set(key, { tag, currencies: [] });
      }
      tagMap.get(key)!.currencies.push(cur);
    } else {
      noTag.push(cur);
    }
  }

  const sections = Array.from(tagMap.values()).sort((a, b) => {
    const aSort =
      mode === "from"
        ? (a.tag.sort_in_from_list ?? 99)
        : (a.tag.sort_in_to_list ?? 99);
    const bSort =
      mode === "from"
        ? (b.tag.sort_in_from_list ?? 99)
        : (b.tag.sort_in_to_list ?? 99);
    return aSort - bSort;
  });

  if (noTag.length > 0) {
    sections.push({
      tag: {
        id: 0,
        name_uk: "Other",
        name_ru: "Other",
        name_en: "Other",
      } as Tag,
      currencies: noTag,
    });
  }

  return sections;
}
