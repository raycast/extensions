import { environment } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useMemo } from "react";
import { join } from "node:path";
import type { Item, SortMode } from "./types";

type UseMditemsOptions = { sortMode?: SortMode };

const binary = join(environment.assetsPath, "mditems");

function parseOutput({ stdout }: { stdout: string }): Item[] {
  if (!stdout.trim()) {
    return [];
  }

  try {
    return JSON.parse(stdout) as Item[];
  } catch (error) {
    console.warn("Failed to parse mditems output", error);
    return [];
  }
}

export function useMditems(directory: string | undefined, options?: UseMditemsOptions) {
  const args = useMemo(() => {
    if (!directory) {
      return [];
    }

    const result = [directory];

    if (options?.sortMode) {
      result.push("--sort", options.sortMode);
    }

    return result;
  }, [directory, options?.sortMode]);

  const exec = useExec<Item[]>(binary, args, {
    execute: args.length > 0,
    keepPreviousData: true,
    parseOutput,
  });

  return {
    ...exec,
    data: exec.data ?? [],
  };
}
