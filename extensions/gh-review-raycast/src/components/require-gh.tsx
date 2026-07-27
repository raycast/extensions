import { Detail } from "@raycast/api";
import type { ReactNode } from "react";

import { useGhStatus } from "../hooks";
import { isBlocked, resetGhCaches } from "../lib/gh-status";
import { SetupRequired } from "./setup-required";

/**
 * The gate every view command sits behind. Until the GitHub CLI is installed,
 * authenticated, and reachable, the command shows the setup screen and nothing
 * else — `children` is never mounted, so no hook inside it runs and no request
 * is attempted.
 *
 * Pass children as an element, not a call: `<RequireGh><Thing /></RequireGh>`.
 * JSX only *creates* the element here; React mounts it once the gate opens.
 */
export function RequireGh({ children }: { children: ReactNode }) {
  const { data: status, isLoading, revalidate } = useGhStatus();

  function recheck() {
    resetGhCaches();
    revalidate();
  }

  // No verdict yet — don't flash the setup screen at someone whose setup is
  // fine.
  if (!status) {
    return <Detail isLoading={isLoading} markdown="" navigationTitle="Checking the GitHub CLI…" />;
  }

  if (isBlocked(status)) {
    return <SetupRequired status={status} onRecheck={recheck} />;
  }

  return <>{children}</>;
}
