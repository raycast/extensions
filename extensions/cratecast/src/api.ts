import fetch from "node-fetch";
import parse from "node-html-parser";
import { useState, useEffect } from "react";
import { URL } from "url";
import { Cache } from "@raycast/api";

const cache = new Cache();

export interface Crate {
  id?: string;
  name: string;
  version: string;
  downloads: number;
  documentationURL?: string;
  homepageURL?: string;
  repositoryURL?: string;
  description?: string;
}

export type SymbolItem = {
  category: string;
  name: string;
  full_name: string;
  docsrs_url: string;
};

type Symbols = SymbolItem[];

export async function getCrates(search: string): Promise<Crate[]> {
  if (search === "") {
    return [];
  }
  const response = await fetch("https://crates.io/api/v1/crates?page=1&per_page=100&q=" + encodeURIComponent(search));
  const json = await response.json();

  const crates: Crate[] = [];
  for (const crate of Object(json).crates) {
    crates.push({
      id: crate.id,
      name: crate.name,
      version: crate.max_version,
      downloads: crate.downloads,
      documentationURL: crate.documentation,
      homepageURL: crate.homepage,
      repositoryURL: crate.repository,
      description: crate.description,
    });
  }
  return crates;
}

const snakeCase = (id: string) => (id.includes("-") ? id.replace(/-/g, "_") : id);

export function useCrateSymbols(crate: Crate): [Symbols | null, boolean, Error | null] {
  const [symbols, setSymbols] = useState<Symbols | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSymbols() {
      setLoading(true);
      try {
        const id = crate.id ?? crate.name;
        const version = crate.version;
        const cachedSymbols = cache.get(`${id}@${version}`);
        if (cachedSymbols) {
          setSymbols(JSON.parse(cachedSymbols));
          return;
        }
        const url = new URL(`https://docs.rs/${id}/${version}/${snakeCase(id)}/all.html`);

        const response = await fetch(url.toString());
        const root = parse(await response.text());

        const mainContent = root.querySelector("#main-content") ?? root.querySelector("#main");
        if (mainContent === null) {
          setSymbols(null);
          return;
        }

        const symbolsResult: Symbols = [];

        const categories = mainContent.querySelectorAll("h3");
        for (const category of categories) {
          const categoryName = category.rawText.trim();
          const items = category.nextElementSibling?.querySelectorAll("li > a");
          if (items) {
            items.forEach((item) => {
              symbolsResult.push({
                category: categoryName,
                name: item.rawText.split("::").pop() || "",
                full_name: item.rawText,
                docsrs_url: `https://docs.rs/${id}/${version}/${id}/${item.getAttribute("href")}` ?? "",
              });
            });
          }
        }
        setSymbols(symbolsResult);
        cache.set(`${id}@${version}`, JSON.stringify(symbolsResult));
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchSymbols();
  }, [crate]);

  return [symbols, loading, error];
}
