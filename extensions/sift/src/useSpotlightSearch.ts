import { spawn } from "child_process";
import { homedir } from "os";
import { createInterface } from "readline";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 120;
const MAX_FOLDER_ENUM_PROCS = 8;
const FIND_MAXDEPTH = "3";

export interface UseSpotlightSearchOptions {
  execute: boolean;
  maxResults: number;
}

export interface UseSpotlightSearchResult {
  data: string[];
  isLoading: boolean;
}

function escapeSpotlightLiteral(s: string): string {
  return s.replace(/'/g, "''");
}

export function useSpotlightSearch(query: string, opts: UseSpotlightSearchOptions): UseSpotlightSearchResult {
  const [data, setData] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (!opts.execute) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean).map(escapeSpotlightLiteral);

    if (tokens.length === 0) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const cap = opts.maxResults * 4;

    const timer = setTimeout(() => {
      runSearch(tokens, cap, controller, setData, setIsLoading);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, opts.execute, opts.maxResults]);

  return { data, isLoading };
}

function runSearch(
  tokens: string[],
  cap: number,
  controller: AbortController,
  setData: React.Dispatch<React.SetStateAction<string[]>>,
  setIsLoading: (b: boolean) => void,
) {
  const home = homedir();
  const fsNameGlob = `*${tokens.join("*")}*`;
  const folderQuery = `kind:folder ${tokens.join(" ")}`;
  const fileQuery = `kMDItemFSName == '${fsNameGlob}'cd && kMDItemContentTypeTree != 'public.folder'`;

  const seen = new Set<string>();
  const batch: string[] = [];
  let flushTimer: NodeJS.Timeout | null = null;
  let pendingEnumProcs = 0;
  let folderProcDone = false;
  let fileProcDone = false;
  let isComplete = false;

  setIsLoading(true);
  setData([]);

  const flush = () => {
    if (batch.length === 0) return;
    const toAdd = batch.splice(0);
    setData((prev) => [...prev, ...toAdd]);
  };

  const scheduleFlush = () => {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, 50);
  };

  const pushPath = (path: string) => {
    if (isComplete || !path || seen.size >= cap || seen.has(path)) return;
    seen.add(path);
    batch.push(path);
    scheduleFlush();
    if (seen.size >= cap) {
      isComplete = true;
      controller.abort();
    }
  };

  const checkDone = () => {
    if (folderProcDone && fileProcDone && pendingEnumProcs === 0 && !isComplete) {
      isComplete = true;
      flush();
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      setIsLoading(false);
    }
  };

  // Call A: find folders matching the query, then enumerate files inside.
  const folderProc = spawn("mdfind", ["-onlyin", home, folderQuery], {
    signal: controller.signal,
    stdio: ["ignore", "pipe", "ignore"],
  });
  const folderRl = createInterface({ input: folderProc.stdout! });

  folderRl.on("line", (folderPath) => {
    if (isComplete || !folderPath) return;
    if (pendingEnumProcs >= MAX_FOLDER_ENUM_PROCS) return;
    pendingEnumProcs++;
    const enumProc = spawn("find", [folderPath, "-maxdepth", FIND_MAXDEPTH, "-type", "f", "-not", "-path", "*/.*"], {
      signal: controller.signal,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const enumRl = createInterface({ input: enumProc.stdout! });
    enumRl.on("line", pushPath);
    const onEnumEnd = () => {
      pendingEnumProcs--;
      checkDone();
    };
    enumProc.on("close", onEnumEnd);
    enumProc.on("error", onEnumEnd);
  });

  const onFolderEnd = () => {
    folderProcDone = true;
    checkDone();
  };
  folderProc.on("close", onFolderEnd);
  folderProc.on("error", onFolderEnd);

  // Call B: filename match — finds files where the basename contains all tokens.
  const fileProc = spawn("mdfind", ["-onlyin", home, fileQuery], {
    signal: controller.signal,
    stdio: ["ignore", "pipe", "ignore"],
  });
  const fileRl = createInterface({ input: fileProc.stdout! });
  fileRl.on("line", pushPath);

  const onFileEnd = () => {
    fileProcDone = true;
    checkDone();
  };
  fileProc.on("close", onFileEnd);
  fileProc.on("error", onFileEnd);
}
