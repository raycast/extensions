import { useCallback, useState } from "react";
import { Requirement } from "../components/Requirements";
import { findGh, findRunpool, forgetRunpoolVersion, runpoolTooOld } from "../lib/runpool";

/**
 * Which dependency is missing, re-checkable without relaunching the command.
 *
 * `findRunpool` re-resolves the preference on every call rather than caching
 * it, but that only helps if something calls it again. Nothing did: once a
 * command had settled on its "not found" screen there was no state left to
 * change, so correcting the path in preferences and coming back left the
 * command stuck until it was relaunched. That is precisely the moment it needs
 * to work.
 *
 * `recheck` exists to re-render. The lookups below then run again, and in the
 * views that gate their status fetch on this, `execute` flips and the fetch
 * starts on its own.
 */
export function useRequirements(options?: { needsGh?: boolean }): {
  missing: Requirement | null;
  recheck: () => void;
} {
  const [, bump] = useState(0);
  const recheck = useCallback(() => {
    forgetRunpoolVersion();
    bump((n) => n + 1);
  }, []);

  if (findRunpool() === null) return { missing: "runpool", recheck };
  if (runpoolTooOld() !== null) return { missing: "runpool-outdated", recheck };
  if (options?.needsGh && findGh() === null) return { missing: "gh", recheck };
  return { missing: null, recheck };
}
