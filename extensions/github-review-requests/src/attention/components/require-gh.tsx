import { Detail } from "@raycast/api";
import { useEffect, type ReactNode } from "react";
import { startMenuBarOnce } from "../lib/menu-onboarding";

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

  useEffect(() => {
    if (!isLoading && status && !isBlocked(status)) {
      // Onboarding must not prevent the requested view from opening.
      void startMenuBarOnce().catch(() => {});
    }
  }, [status, isLoading]);

  function recheck() {
    resetGhCaches();
    revalidate();
  }

  // No verdict yet — don't flash the setup screen at someone whose setup is
  // fine.
  if (!status) {
    return <Detail isLoading={isLoading} markdown="" navigationTitle="Checking GitHub access…" />;
  }

  if (isBlocked(status)) {
    return <SetupRequired status={status} onRecheck={recheck} />;
  }

  return <>{children}</>;
}
