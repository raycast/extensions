import { exec } from "child_process";
import { getDashAppPath } from "./dashApp";
import { useEffect, useState } from "react";
import { parse } from "fast-xml-parser";

export type DashResult = {
  title: string;
  subtitle: string[];
  icon: string;
  quicklookurl: string;
  "@_uid": string;
};

async function searchDash(query: string): Promise<DashResult[]> {
  return new Promise((resolve, reject) => {
    exec(
      `./dashAlfredWorkflow ${query}`,
      {
        cwd: `${getDashAppPath()}/Contents/Resources`,
      },
      (err, data) => {
        if (err) reject(err);

        const jsonData = parse(data, { ignoreAttributes: false });

        if (jsonData.output !== undefined) {
          if (Array.isArray(jsonData.output.items.item)) {
            resolve(jsonData.output.items.item);
          } else {
            resolve([ jsonData.output.items.item ]);
          }
        } else {
          resolve([]);
        }
      }
    );
  });
}

export function useDocsetSearch(searchText: string, keyword = ""): [DashResult[], boolean] {
  const [isLoading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<DashResult[]>([]);

  async function fetchDashResults() {
    setLoading(true);
    if (searchText.length) {
      setResults(await searchDash(`${keyword ? `${keyword}:`: ''}${searchText}`));
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
