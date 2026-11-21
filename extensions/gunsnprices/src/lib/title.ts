import { parseTitle } from "gunsnprices";
import type { ProductInfo } from "gunsnprices";
import { cell, formatCount, formatMoney, formatPerRound, parsePrice } from "./format.ts";

export interface ParsedTitle {
  title: string;
  price: number | null;
  info: ProductInfo;
  fields: { label: string; value: string }[];
}

const INLINE_PRICE = /(^|\s)(?:US\$|\$)\s?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)(?=$|[\s),;])/i;

/** Take a "$18.99" written inside the title out of it. */
export function splitInlinePrice(title: string): { title: string; price: number | null } {
  const m = INLINE_PRICE.exec(title);
  if (!m) return { title: title.trim(), price: null };
  const rest = (title.slice(0, m.index) + (m[1] ?? "") + title.slice(m.index + m[0].length))
    .replace(/\s+[-|@]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { title: rest, price: parsePrice(m[2]) };
}

/** Parse a listing title; the price may be given separately or written in the title ("... $18.99"). */
export function parseListing(rawTitle: string, rawPrice?: string): ParsedTitle {
  const inline = splitInlinePrice(rawTitle);
  const price = parsePrice(rawPrice) ?? inline.price;
  const info = parseTitle(inline.title, price ? { price } : {});
  const fields: { label: string; value: string }[] = [];
  fields.push({ label: "Type", value: info.kind === "ammo" ? "Ammo" : "Firearm" });
  if (info.brand) fields.push({ label: "Brand", value: info.brand });
  if (info.model) {
    fields.push({ label: "Model", value: info.model.model });
    fields.push({ label: "Model family", value: info.model.family });
    if (info.model.generation) fields.push({ label: "Generation", value: info.model.generation });
    if (info.model.configs.length) fields.push({ label: "Configuration", value: info.model.configs.join(", ") });
    if (info.model.features.length) fields.push({ label: "Features", value: info.model.features.join(", ") });
  }
  if (info.calibers.length) {
    fields.push({
      label: info.calibers.length > 1 ? "Calibers" : "Caliber",
      value: info.calibers.map((c) => c.name).join(" / "),
    });
  }
  if (info.capacity) fields.push({ label: "Capacity", value: `${info.capacity} rounds` });
  if (info.barrelLength) fields.push({ label: "Barrel", value: `${info.barrelLength}"` });
  if (info.rounds) fields.push({ label: "Rounds per box", value: formatCount(info.rounds) });
  if (price) fields.push({ label: "Price", value: formatMoney(price) });
  if (info.costPerRound != null) fields.push({ label: "Cost per round", value: formatPerRound(info.costPerRound) });
  return { title: inline.title, price, info, fields };
}

/** The fields as a Markdown table. */
export function fieldsTable(p: ParsedTitle): string {
  return ["| Field | Value |", "|---|---|", ...p.fields.map((f) => `| ${f.label} | ${cell(f.value)} |`)].join("\n");
}

/** Markdown for the Detail view. */
export function listingMarkdown(p: ParsedTitle): string {
  const out = [`## ${p.title.replace(/[#*_`[\]<>]/g, (ch) => "\\" + ch)}`, "", fieldsTable(p)];
  if (p.info.kind === "ammo" && !p.info.rounds) {
    out.push("", "No round count found. Write it like `50rd`, `20 rounds` or `box of 25`.");
  } else if (p.fields.length <= 1) {
    out.push("", "No caliber, model or round count recognized in this title.");
  }
  return out.join("\n");
}

/** The parse result as JSON, for copying into code or a spreadsheet tool. */
export function listingJson(p: ParsedTitle): string {
  const { info } = p;
  return JSON.stringify(
    {
      title: p.title,
      kind: info.kind,
      brand: info.brand || null,
      model: info.model,
      calibers: info.calibers.map((c) => c.name),
      capacity: info.capacity,
      barrelLength: info.barrelLength,
      rounds: info.rounds,
      price: p.price,
      costPerRound: info.costPerRound,
    },
    null,
    2,
  );
}
