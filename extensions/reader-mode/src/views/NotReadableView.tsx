import { Detail } from "@raycast/api";
import { NotReadableActions } from "../actions/NotReadableActions";
import { isKnownPaywalledSite } from "../extractors/_paywall";

interface NotReadableViewProps {
  url: string;
  error: string;
  onRetryWithoutCheck: () => void;
  onTryPaywallHopper?: () => void;
}

function buildNotReadableMarkdown(error: string, isPaywalledSite: boolean): string {
  const paywallOption = isPaywalledSite
    ? "\n- **Try Paywall Hopper** — Attempt to retrieve content from archive services"
    : "";

  return `# Sorry, we couldn't find any readable content 🤷🏻‍♂️

${error}

**What you can do:**
- **Try Anyway** — Bypass the readability check and attempt to extract content${paywallOption}
- **Open in Browser** — View the page in your browser instead

*Note: Bypassing the check may result in poorly formatted content or extraction failures.*`;
}

export function NotReadableView({ url, error, onRetryWithoutCheck, onTryPaywallHopper }: NotReadableViewProps) {
  const isPaywalledSite = isKnownPaywalledSite(url);
  const markdown = buildNotReadableMarkdown(error, isPaywalledSite);

  return (
    <Detail
      markdown={markdown}
      actions={
        <NotReadableActions
          url={url}
          onRetryWithoutCheck={onRetryWithoutCheck}
          onTryPaywallHopper={isPaywalledSite ? onTryPaywallHopper : undefined}
        />
      }
    />
  );
}
