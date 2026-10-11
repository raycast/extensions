import { load } from "cheerio";
import { fetchText } from "../lib/http";
import { parseQuery } from "../lib/query";
import type { SearchProvider, WorkResult } from "../types";

type JsonRecord = Record<string, unknown>;

export const amazonMetadataProvider: SearchProvider = {
  id: "amazon-metadata",
  name: "Amazon Product Metadata",
  async search(query, context) {
    const productUrl =
      amazonProductUrl(query) ?? isbnProductUrl(parseQuery(query).isbn);
    if (!productUrl) return [];

    try {
      const html = await fetchText(productUrl, context.signal, {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      });
      const result = parseAmazonProduct(html, productUrl);
      return result ? [result] : [];
    } catch {
      // Amazon may present a consent or bot-check page. Other enabled metadata
      // providers continue normally, so this optional enrichment fails quietly.
      return [];
    }
  },
};

function parseAmazonProduct(
  html: string,
  productUrl: string,
): WorkResult | undefined {
  const $ = load(html);
  const product = $("script[type='application/ld+json']")
    .toArray()
    .flatMap((element) => parseJson($(element).text()))
    .flatMap(flattenJsonLd)
    .find((entry) =>
      typeNames(entry).some((type) =>
        ["book", "product"].includes(type.toLowerCase()),
      ),
    );

  const title =
    text(product?.name) ||
    $("#productTitle").text().trim() ||
    meta($, "og:title");
  if (!title) return undefined;
  const authors = authorNames(product?.author);
  if (!authors.length) {
    $("#bylineInfo a.a-link-normal").each((_, element) => {
      const author = $(element)
        .text()
        .replace(/\s*\(Author\).*$/i, "")
        .trim();
      if (author) authors.push(author);
    });
  }
  const isbn =
    text(product?.isbn) ?? text(product?.sku) ?? asinFromUrl(productUrl);
  const datePublished = text(product?.datePublished);
  const image = imageUrl(product?.image) ?? meta($, "og:image");
  const publisher =
    organizationName(product?.publisher) ?? detailValue($, /publisher/i);
  const description = text(product?.description) ?? meta($, "og:description");
  const asin = asinFromUrl(productUrl);

  return {
    id: `amazon:${asin ?? normalizeId(title)}`,
    title,
    authors: [...new Set(authors)],
    year: datePublished?.match(/\b(1[5-9]\d{2}|20\d{2})\b/)
      ? Number(datePublished.match(/\b(1[5-9]\d{2}|20\d{2})\b/)![1])
      : undefined,
    publisher,
    kind: "book",
    coverUrl: image,
    abstract: description,
    identifiers: {
      isbn:
        isbn && /^(?:97[89])?\d{9}[\dX]$/i.test(isbn.replace(/[^0-9X]/gi, ""))
          ? [isbn.replace(/[^0-9X]/gi, "")]
          : undefined,
      other: asin ? [`ASIN:${asin}`] : undefined,
    },
    citation: { url: productUrl },
    sources: ["Amazon Product Page"],
    accessLinks: [
      {
        label: "Amazon Product Page",
        url: productUrl,
        source: "Amazon",
        kind: "record",
      },
    ],
  };
}

function amazonProductUrl(value: string): string | undefined {
  const match = value.match(/https?:\/\/[^\s<>]+/i);
  if (!match) return undefined;
  try {
    const url = new URL(match[0].replace(/[),.;]+$/, ""));
    if (!/(^|\.)amazon\.[a-z.]+$/i.test(url.hostname)) return undefined;
    const asin = asinFromUrl(url.href);
    return asin ? `${url.origin}/dp/${asin}` : undefined;
  } catch {
    return undefined;
  }
}

function isbnProductUrl(isbn?: string): string | undefined {
  if (!isbn) return undefined;
  return `https://www.amazon.com/dp/${isbn.length === 13 ? (isbn13To10(isbn) ?? isbn) : isbn}`;
}

function isbn13To10(isbn: string): string | undefined {
  if (!isbn.startsWith("978") || isbn.length !== 13) return undefined;
  const body = isbn.slice(3, 12);
  const total = [...body].reduce(
    (sum, digit, index) => sum + Number(digit) * (10 - index),
    0,
  );
  const check = (11 - (total % 11)) % 11;
  return `${body}${check === 10 ? "X" : check}`;
}

function asinFromUrl(url: string): string | undefined {
  return url
    .match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1]
    ?.toUpperCase();
}

function parseJson(value: string): unknown[] {
  try {
    return [JSON.parse(value) as unknown];
  } catch {
    return [];
  }
}

function flattenJsonLd(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (!value || typeof value !== "object") return [];
  const record = value as JsonRecord;
  return [
    record,
    ...flattenJsonLd(record["@graph"]),
    ...flattenJsonLd(record.mainEntity),
  ];
}

function typeNames(record: JsonRecord): string[] {
  const value = record["@type"];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string"
      ? [value]
      : [];
}

function authorNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(authorNames);
  if (typeof value === "string") return [value];
  if (value && typeof value === "object")
    return text((value as JsonRecord).name)
      ? [text((value as JsonRecord).name)!]
      : [];
  return [];
}

function organizationName(value: unknown): string | undefined {
  return typeof value === "string"
    ? value
    : value && typeof value === "object"
      ? text((value as JsonRecord).name)
      : undefined;
}

function imageUrl(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value))
    return value.find((item): item is string => typeof item === "string");
  return value && typeof value === "object"
    ? text((value as JsonRecord).url)
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function meta(
  $: ReturnType<typeof load>,
  property: string,
): string | undefined {
  return $("meta")
    .filter(
      (_, element) =>
        $(element).attr("property") === property ||
        $(element).attr("name") === property,
    )
    .first()
    .attr("content")
    ?.trim();
}

function detailValue(
  $: ReturnType<typeof load>,
  label: RegExp,
): string | undefined {
  let result: string | undefined;
  $(
    "#detailBullets_feature_div li, #productDetails_detailBullets_sections1 tr",
  ).each((_, element) => {
    if (result) return;
    const value = $(element).text().replace(/\s+/g, " ").trim();
    if (label.test(value)) result = value.replace(/^.*?[:：]\s*/, "").trim();
  });
  return result;
}

function normalizeId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
