import { useEffect, useRef, useState } from "react";
import { parse } from "fast-xml-parser";
import { execFile } from "child_process";
import { promisify } from "util";
import useDashApp from "./useDashApp";
import { DashResult } from "../types";
import { Application } from "@raycast/api";
const execFilePromisified = promisify(execFile);

export default function useDocsetSearch(searchText: string, keyword = ""): [DashResult[], boolean] {
  const [state, setState] = useState<{ isLoading: boolean; results: DashResult[] }>({ isLoading: true, results: [] });
  const cancel = useRef<AbortController>(new AbortController());
  const [dashApp, isDashAppLoading] = useDashApp();

  useEffect(() => {
    if (!dashApp || isDashAppLoading) {
      return;
    }
    (async () => {
      setState((previous) => ({ ...previous, isLoading: true }));
      cancel.current?.abort();
      cancel.current = new AbortController();
      if (!searchText) {
        setState({ results: [], isLoading: false });
        return;
      }
      try {
        setState({
          results: await searchDash(dashApp, `${keyword ? `${keyword}:` : ""}${searchText}`, cancel.current.signal),
          isLoading: false,
        });
      } catch (err) {
        setState({ results: [], isLoading: false });
      }
    })();
    return function cleanup() {
      cancel.current?.abort();
    };
  }, [dashApp, searchText]);

  return [state.results, state.isLoading];
}

async function searchDash(dashApp: Application, query: string, signal: AbortSignal): Promise<DashResult[]> {
  try {
    const { stdout: data } = await execFilePromisified(`./dashAlfredWorkflow`, [query], {
      cwd: `${dashApp.path}/Contents/Resources`,
      signal,
    });
    const jsonData = parse(data, { ignoreAttributes: false });

    if (!jsonData || (typeof jsonData.output === "undefined" && typeof jsonData.items === "undefined")) {
      return [];
    }

    const items = jsonData.output?.items.item ?? jsonData.items.item;

    if (Array.isArray(items)) {
      return items;
    }
    return [items];
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return [];
    }
    throw err;
  }
}
