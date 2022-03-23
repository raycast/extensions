import { useEffect, useRef, useState } from "react";
import { parse } from "fast-xml-parser";
import { execFile } from "child_process";
import { promisify } from "util";
import { getDashApp } from "../util";
import { DashResult } from "../types";
const execFilePromisified = promisify(execFile);

export default function useDocsetSearch(searchText: string, keyword = ""): [DashResult[], boolean] {
  const [state, setState] = useState<{ isLoading: boolean; results: DashResult[] }>({ isLoading: true, results: [] });
  const cancel = useRef<AbortController>(new AbortController());

  useEffect(() => {
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
          results: await searchDash(`${keyword ? `${keyword}:` : ""}${searchText}`, cancel.current.signal),
          isLoading: false,
        });
      } catch (err) {
        setState({ results: [], isLoading: false });
      }
    })();
    return function cleanup() {
      cancel.current?.abort();
    };
  }, [searchText]);

  return [state.results, state.isLoading];
}

async function searchDash(query: string, signal: AbortSignal): Promise<DashResult[]> {
  const dashApp = await getDashApp();

  try {
    const { stdout: data } = await execFilePromisified(`./dashAlfredWorkflow`, [query], {
      cwd: `${dashApp.path}/Contents/Resources`,
      signal,
    });
    const jsonData = parse(data, { ignoreAttributes: false });
    if (!jsonData || typeof jsonData.output === "undefined") {
      return [];
    }
    if (Array.isArray(jsonData.output.items.item)) {
      return jsonData.output.items.item;
    }
    return [jsonData.output.items.item];
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return [];
    }
    throw err;
  }
}
