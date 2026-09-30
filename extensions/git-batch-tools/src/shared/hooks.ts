import { useState, useEffect } from "react";
import { ProjectGroup } from "./types";
import { countRepos } from "./git";

export function useRepoCounts(groups: ProjectGroup[]): Record<string, number> {
  const [repoCounts, setRepoCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      groups.map(async (group) => {
        const count = await countRepos(group.path);
        return { path: group.path, count };
      }),
    ).then((results) => {
      if (!cancelled) {
        setRepoCounts(Object.fromEntries(results.map((r) => [r.path, r.count])));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return repoCounts;
}
