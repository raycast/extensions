import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { getLogger } from "../utils/logger";
import { checkPageSuppliedUrl, GuardResult, untilAborted } from "../utils/networkGuard";
import { redactUrlForLog } from "../utils/urlUtils";
import { DigResults } from "./DigResults";

const log = getLogger("guard");

/** `checkPageSuppliedUrl` resolves DNS, which takes no deadline of its own. */
const CHECK_TIMEOUT_MS = 5000;

/**
 * Digs a URL that a page supplied, such as a sitemap entry, only after the check
 * every page-supplied fetch gets. Without it, a sitemap could point Digger at
 * 169.254.169.254 or a router's admin page. A typed URL skips this: typing it is
 * the user's own choice.
 */
export function GuardedDig({ url, siteUrl }: { url: string; siteUrl: string }) {
  // Keyed to the address it answers for, so a verdict can never apply to a different one.
  const [checked, setChecked] = useState<{ key: string; result: GuardResult }>();
  const key = `${url}\n${siteUrl}`;
  const verdict = checked?.key === key ? checked.result : undefined;

  useEffect(() => {
    let canceled = false;
    untilAborted(checkPageSuppliedUrl(url, siteUrl), AbortSignal.timeout(CHECK_TIMEOUT_MS)).then(
      (result) => !canceled && setChecked({ key, result }),
      () => !canceled && setChecked({ key, result: { allowed: false, reason: "the address check timed out" } }),
    );
    return () => {
      canceled = true;
    };
  }, [key]);

  useEffect(() => {
    if (verdict && !verdict.allowed) log.warn("dig:refused", { url: redactUrlForLog(url), reason: verdict.reason });
  }, [verdict, url]);

  if (!verdict) return <List isLoading searchBarPlaceholder="Checking the address…" />;
  if (verdict.allowed) return <DigResults url={url} />;

  return (
    <List>
      <List.EmptyView
        icon={Icon.Warning}
        title="Digger won't follow this link"
        description="A sitemap can only send Digger to public addresses; to dig it anyway, type it into Digger."
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
            <Action.OpenInBrowser url={url} shortcut={Keyboard.Shortcut.Common.Open} />
          </ActionPanel>
        }
      />
    </List>
  );
}
