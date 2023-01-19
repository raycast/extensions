import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { parse, HTMLElement } from "node-html-parser";

export interface Deal {
  name: string;
  value?: string;
  image?: string;
  url: string;
}

export interface DealDetailsPrice {
  store: string;
  version?: string;
  price: string;
}

export interface DealDetailsMetadata {
  key: string;
  value: string | string[];
}

export interface DealDetailsDLC {
  name: string;
  price: string;
}

export interface DealDetails {
  imageURL?: string;
  description?: string;
  prices?: DealDetailsPrice[];
  metadata?: DealDetailsMetadata[];
  dlcs?: DealDetailsDLC[];
}

const extractImageURL = (html?: HTMLElement): DealDetails["imageURL"] =>
  html?.querySelector("img.responsive-img.shadow-img.shadow-img-large")?.attributes["src"];
const extractDescription = (html?: HTMLElement): DealDetails["description"] =>
  html?.querySelector(".description")?.textContent;
const extractPrices = (html?: HTMLElement): DealDetails["prices"] => {
  const table = html?.querySelector("table.item-price-table");
  if (!table) return;
  const elements = table.querySelectorAll("tr");
  const mapped = elements.map((e) => {
    const store = e.querySelector("div.logo > img")?.attributes["alt"] ?? "";
    const version = e.querySelector(".version")?.textContent.trim() ?? "";
    const price = e.querySelector("td > a > div.btn")?.textContent.trim() ?? "";
    return { store, version, price };
  });
  return mapped;
};
const extractMetadata = (html?: HTMLElement): DealDetails["metadata"] => {
  const el = html?.querySelector("ul.details");
  const entries = el?.querySelectorAll("li.list-group-item");
  const mapped = entries
    ?.flatMap((e) => {
      const [key, ...children] = e.childNodes.filter((n) => !!n.innerText.trim());
      if (!key || !children) return;

      let value: string | string[];

      const childrenStr = children.toString().trim() ?? "";
      if (children.length > 1 || childrenStr.startsWith("<ul")) {
        value = children.flatMap((c) => c.childNodes.map((cc) => cc.innerText.trim()));
      } else if (children.length == 1) {
        const string = children[0].innerText.trim();
        const split = string.split(", ");
        if (split.length > 1 && !Date.parse(string)) {
          value = split;
        } else {
          value = string;
        }
      } else {
        return;
      }

      return {
        key: key.innerText.slice(0, -1),
        value,
      };
    })
    .filter(Boolean);
  return mapped as DealDetailsMetadata[];
};
const extractDLCs = (html?: HTMLElement): DealDetails["dlcs"] => {
  const parent = html?.querySelector("#dlcCollapse");
  if (!parent) return;
  const mapped = parent.childNodes
    .map((n) => {
      const childNodes = n.childNodes.filter((nn) => !!nn.innerText.trim());
      if (childNodes.length < 2) return;
      const [nameEl, priceEl] = childNodes;
      return { name: nameEl.innerText.trim(), price: priceEl.innerText.trim() };
    })
    .filter(Boolean);
  return mapped as DealDetailsDLC[];
};

export async function getDetails(deal: Deal): Promise<DealDetails> {
  const response = await fetch(`https://www.dekudeals.com${deal.url}`);
  const text = await response.text();
  const parsed = parse(text);

  const imageURL = extractImageURL(parsed);
  const description = extractDescription(parsed);
  const prices = extractPrices(parsed);
  const metadata = extractMetadata(parsed);
  const dlcs = extractDLCs(parsed);

  return {
    imageURL,
    description,
    prices,
    metadata,
    dlcs,
  };
}

export async function performSearch(searchText: string, signal: AbortSignal): Promise<Deal[]> {
  if (searchText.length < 3) return [];

  const preferences = getPreferenceValues();
  const token = preferences["token"];
  if (!token) throw Error("No API token!");

  const params = new URLSearchParams();
  params.append("term", searchText);

  const response = await fetch("https://www.dekudeals.com/autocomplete" + "?" + params.toString(), {
    method: "get",
    signal: signal,
    headers: {
      Cookie: `rack.session=${token}`,
    },
  });
  const setCookie = response.headers.get("Set-Cookie");
  if (setCookie) {
    const entries = setCookie.split("; ").map((k) => k.split("="));
    const object = Object.fromEntries(entries);
    const rackSession = object["rack.session"];
    if (rackSession) preferences["token"] = rackSession;
  }

  const json = await response.json();
  return json as Deal[];
}
