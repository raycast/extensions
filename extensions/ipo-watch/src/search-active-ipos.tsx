import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import React, { useEffect, useState, useRef } from "react";

type RawApiItem = Record<string, unknown> & {
  "~id"?: number;
  Name?: string;
  GMP?: string;
  "~urlrewrite_folder_name"?: string;
  "Updated-On"?: string;
  "~ipo_name"?: string;
};

type IpoItem = {
  id: string;
  name: string;
  gmp: string;
  urlPath: string;
  updatedOn?: string;
  raw: RawApiItem;
  price?: string;
  ipoSize?: string;
  lot?: string;
  open?: string;
  close?: string;
  boa?: string;
  listing?: string;
  rating?: string;
  sub?: string;
  gmpRange?: string;
  anchor?: string;
  status?: "open" | "closed" | "upcoming";
  closingSoon?: boolean;
  upcoming?: boolean;
};

function buildApiUrl(search = "") {
  const now = new Date();
  let startYear = now.getFullYear();
  if (now.getMonth() < 3) {
    startYear -= 1;
  }
  const fySegment = `${startYear}-${(startYear + 1).toString().slice(-2)}`;
  const yearSegment = `${startYear}`;

  return `https://webnodejs.investorgain.com/cloud/report/data-read/331/1/10/${yearSegment}/${fySegment}/0/all?search=${encodeURIComponent(
    search,
  )}&v=16-49`;
}

function parseRating(ratingHtml?: string): string {
  if (!ratingHtml) return "—";

  const normalized = ratingHtml.replaceAll("", "★");

  const starCount = (normalized.match(/★/g) || []).length;
  if (starCount > 0) {
    return "★".repeat(starCount);
  }

  const text = stripHtml(normalized).trim();
  return text || "—";
}

function stripHtml(html = ""): string {
  const noTags = html.replace(/<[^>]*>/g, "");
  return noTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8377;/g, "₹")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)));
}

function formatIsoToShort(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()}-${months[d.getMonth()]}`;
}

function getIpoStatus(item: { open?: string; close?: string; listing?: string }): "open" | "closed" | "upcoming" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    const cleaned = dateStr.trim();
    const months: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const match = cleaned.match(/(\d{1,2})-([a-zA-Z]{3})/i);
    if (!match) return null;
    const [, day, month] = match;
    const monthIdx = months[month.toLowerCase()];
    if (monthIdx === undefined) return null;
    const date = new Date();
    date.setMonth(monthIdx);
    date.setDate(Number(day));
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const openDate = parseDate(item.open);
  const closeDate = parseDate(item.close);
  const listingDate = parseDate(item.listing);

  if (listingDate && listingDate < today) return "closed";
  if (closeDate && closeDate < today) return "closed";
  if (openDate && openDate > today) return "upcoming";
  return "open";
}

function StatusDropdown(props: {
  status: "open" | "closed" | "upcoming";
  onStatusChange: (newStatus: "open" | "closed" | "upcoming") => void;
}) {
  const { status, onStatusChange } = props;
  return (
    <List.Dropdown
      tooltip="Filter by Status"
      value={status}
      onChange={(newValue) => onStatusChange(newValue as "open" | "closed" | "upcoming")}
    >
      <List.Dropdown.Item title="Open Today" value="open" icon={Icon.CheckCircle} />
      <List.Dropdown.Item title="Upcoming" value="upcoming" icon={Icon.Clock} />
      <List.Dropdown.Item title="Closed" value="closed" icon={Icon.XmarkCircle} />
    </List.Dropdown>
  );
}

export default function Command() {
  const [items, setItems] = useState<IpoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "closed" | "upcoming">("open");
  const [showingDetail, setShowingDetail] = useState<boolean>(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(search = "") {
    setIsLoading(true);
    setError(null);
    try {
      const url = buildApiUrl(search);
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`API error ${res.status}`);

      type ApiResp = { reportTableData?: RawApiItem[] };
      const data = (await res.json()) as unknown;
      const raw: RawApiItem[] = data && typeof data === "object" ? ((data as ApiResp).reportTableData ?? []) : [];
      const mapped: IpoItem[] = raw.map((r) => {
        const id = String(r["~id"] ?? r["~urlrewrite_folder_name"] ?? Math.random());
        let name = stripHtml(String(r.Name ?? r["~ipo_name"] ?? "Unknown"));
        // Detect trailing status letter indicator (e.g., "Groww IPO U" or "NameC")
        let closingSoon = false,
          upcoming = false;
        const statusLetterMatch = name.match(/\s*([UOC])$/i);
        if (statusLetterMatch) {
          const letter = statusLetterMatch[1].toUpperCase();
          if (letter === "C") closingSoon = true;
          // Remove the trailing letter from the displayed name
          if (letter === "U") upcoming = true;
          name = name.replace(/\s*([UOC])$/i, "").trim();
        }
        const gmp = stripHtml(String(r.GMP ?? ""));
        const urlPath = String(r["~urlrewrite_folder_name"] ?? "/");
        const updatedOn = stripHtml(String(r["Updated-On"] ?? ""));
        // Prefer ISO date fields when available and format to short form for display/parsing
        const openIso = String(r["~Srt_Open"] ?? r.Open ?? "");
        const closeIso = String(r["~Srt_Close"] ?? r.Close ?? "");
        const boaIso = String(r["~Srt_BoA_Dt"] ?? r["BoA Dt"] ?? "");
        const listingIso = String(r["~Str_Listing"] ?? r.Listing ?? r["~Str_Listing"] ?? "");
        const open = stripHtml(formatIsoToShort(openIso) || String(r.Open ?? ""));
        const close = stripHtml(formatIsoToShort(closeIso) || String(r.Close ?? ""));
        const boa = stripHtml(formatIsoToShort(boaIso) || String(r["BoA Dt"] ?? ""));
        const listing = stripHtml(formatIsoToShort(listingIso) || String(r.Listing ?? ""));
        const price = stripHtml(String(r.Price ?? ""));
        const ipoSize = stripHtml(String(r["IPO Size"] ?? ""));
        const lot = stripHtml(String(r.Lot ?? ""));
        const rating = stripHtml(String(r.Rating ?? ""));
        const sub = stripHtml(String(r.Sub ?? ""));
        const gmpRange = stripHtml(String(r["GMP(L/H)"] ?? ""));
        const anchor = stripHtml(String(r.Anchor ?? ""));

        const item: IpoItem = {
          id,
          name,
          gmp,
          urlPath,
          updatedOn,
          raw: r,
          price,
          ipoSize,
          lot,
          open,
          close,
          boa,
          listing,
          rating,
          sub,
          gmpRange,
          anchor,
          status: getIpoStatus({ open, close, listing }),
          closingSoon,
          upcoming,
        };
        return item;
      });
      setItems(mapped);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load("");
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current as unknown as number);
      }
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current as unknown as number);
    }
    debounceRef.current = setTimeout(() => {
      setSelectedId(null);
      load(searchText.trim());
    }, 400);
  }, [searchText]);

  // performance hook removed

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search IPOs"
      onSearchTextChange={(text) => setSearchText(text)}
      selectedItemId={selectedId ?? undefined}
      searchBarAccessory={
        <StatusDropdown
          status={filter}
          onStatusChange={(newStatus) => {
            setFilter(newStatus);
            setSelectedId(null);
          }}
        />
      }
    >
      {error ? (
        <List.Item
          id="error"
          title={`Failed to load IPOs`}
          subtitle={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={() => load("")} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ) : (
        items
          .filter((it) => it.status === filter)
          .map((it) => {
            const statusLabel =
              it.status === "open" ? "Open" : it.status === "upcoming" || it.upcoming ? "Upcoming" : "Closed";

            // Build accessories dynamically and omit missing values
            const accessories = !showingDetail
              ? (() => {
                  const a: unknown[] = [];
                  // If the item is upcoming, omit GMP and Price from accessories
                  if (it.status !== "upcoming") {
                    if (it.gmp && it.gmp.trim() && it.gmp !== "—")
                      a.push({ tag: { value: it.gmp, color: Color.SecondaryText } });
                    if (it.price && it.price.trim() && it.price !== "—")
                      a.push({ tag: { value: `₹${it.price}`, color: Color.Green } });
                  } else {
                    // intentionally omitted GMP and Price for upcoming IPO
                  }
                  const ratingText = parseRating(it.rating);
                  if (ratingText && ratingText !== "—") a.push({ tag: { value: ratingText, color: Color.Yellow } });
                  if (it.ipoSize && it.ipoSize.trim() && it.ipoSize !== "—")
                    a.push({ tag: { value: `${it.ipoSize} (sz)`, color: Color.Purple } });
                  if (it.closingSoon) a.push({ tag: { value: "Closing soon", color: Color.Orange } });
                  return a;
                })()
              : undefined;

            return (
              <List.Item
                key={it.id}
                id={it.id}
                title={it.name}
                subtitle={it.status === "open" ? undefined : statusLabel}
                accessories={accessories as unknown as List.Item.Accessory[]}
                icon={Icon.List}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Status" text={statusLabel} />
                        <List.Item.Detail.Metadata.Separator />

                        <List.Item.Detail.Metadata.Label title="Open" text={it.open || "—"} />
                        <List.Item.Detail.Metadata.Label title="Close" text={it.close || "—"} />
                        <List.Item.Detail.Metadata.Label title="BoA Dt" text={it.boa || "—"} />
                        <List.Item.Detail.Metadata.Label title="Listing" text={it.listing || "—"} />

                        <List.Item.Detail.Metadata.Separator />

                        <List.Item.Detail.Metadata.TagList title="Key Metrics">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={`GMP: ${it.gmp || "—"}`}
                            color={Color.SecondaryText}
                          />
                          <List.Item.Detail.Metadata.TagList.Item
                            text={`GMP Range: ${it.gmpRange || "—"}`}
                            color={Color.SecondaryText}
                          />
                          <List.Item.Detail.Metadata.TagList.Item
                            text={`Price: ₹${it.price || "—"}`}
                            color={Color.Green}
                          />
                          <List.Item.Detail.Metadata.TagList.Item
                            text={`IPO Size: ${it.ipoSize || "—"}`}
                            color={Color.Purple}
                          />
                          <List.Item.Detail.Metadata.TagList.Item
                            text={`Lot: ${it.lot || "—"}`}
                            color={Color.SecondaryText}
                          />
                        </List.Item.Detail.Metadata.TagList>

                        <List.Item.Detail.Metadata.Separator />

                        <List.Item.Detail.Metadata.Label title="Rating" text={it.rating || "—"} />
                        <List.Item.Detail.Metadata.Label title="Subscription" text={it.sub || "—"} />
                        <List.Item.Detail.Metadata.Label title="Anchor" text={it.anchor || "—"} />
                        <List.Item.Detail.Metadata.Label title="Updated" text={it.updatedOn || "—"} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title={showingDetail ? "Hide Details" : "Show Details"}
                      onAction={() => setShowingDetail(!showingDetail)}
                      icon={Icon.AppWindowSidebarLeft}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                    <Action.OpenInBrowser url={`https://www.investorgain.com${it.urlPath}`} />
                    <Action.CopyToClipboard title="Copy IPO Name" content={it.name} />
                    <Action.CopyToClipboard title="Copy GMP" content={it.gmp || ""} />
                    <Action.CopyToClipboard title="Copy as JSON" content={JSON.stringify(it.raw)} />
                    <Action title="Refresh" onAction={() => load(searchText)} icon={Icon.ArrowClockwise} />
                  </ActionPanel>
                }
              />
            );
          })
      )}
    </List>
  );
}
