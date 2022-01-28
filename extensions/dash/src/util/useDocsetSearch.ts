import { exec } from "child_process";
import { getDashAppPath } from "./dashApp";
import { useEffect, useRef, useState } from "react";
import { parse } from "fast-xml-parser";

export type DashResult = {
  title: string;
  subtitle: string[];
  icon: string;
  quicklookurl: string;
  "@_uid": string;
};

async function searchDash(query: string, signal: AbortSignal): Promise<DashResult[]> {
  const dashPath = await getDashAppPath();

  return new Promise((resolve, reject) => {
    exec(
      `./dashAlfredWorkflow ${query}`,
      {
        cwd: `${dashPath}/Contents/Resources`,
        signal,
      },
      (err, data) => {
        if (err && err.name === "AbortError") return;
        if (err) reject(err);

        const jsonData = parse(data, { ignoreAttributes: false });

        if (jsonData.output !== undefined) {
          if (Array.isArray(jsonData.output.items.item)) {
            resolve(jsonData.output.items.item);
          } else {
            resolve([jsonData.output.items.item]);
          }
        } else {
          resolve([]);
        }
      }
    );
  });
}

export function useDocsetSearch(searchText: string, keyword = ""): [DashResult[], boolean] {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [results, setResults] = useState<DashResult[]>([]);
  const cancel = useRef<AbortController>(new AbortController());

  async function fetchDashResults() {
    cancel.current.abort();
    cancel.current = new AbortController();

    setLoading(true);
    if (searchText.length) {
      setResults(await searchDash(`${keyword ? `${keyword}:` : ""}${searchText}`, cancel.current.signal));
    } else {
      setResults([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchDashResults();
  }, [searchText]);

  return [results, isLoading];
}
