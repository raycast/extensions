import { Detail } from "@raycast/api";
import { NotReadableActions } from "../actions/NotReadableActions";

interface NotReadableViewProps {
  url: string;
  error: string;
  onRetryWithoutCheck: () => void;
  onTryPaywallHopper?: () => void;
}

function buildNotReadableMarkdown(error: string): string {
  return `# Sorry, we couldn't find any readable content 🤷🏻‍♂️

${error}

**What you can do:**
- **Try Anyway** — Bypass the readability check and attempt to extract content
- **Open in Browser** — View the page in your browser instead

*Note: Bypassing the check may result in poorly formatted content or extraction failures.*`;
}

export function NotReadableView({ url, error, onRetryWithoutCheck, onTryPaywallHopper }: NotReadableViewProps) {
  const markdown = buildNotReadableMarkdown(error);

  return (
    <Detail
      markdown={markdown}
      actions={
        <NotReadableActions
          url={url}
          onRetryWithoutCheck={onRetryWithoutCheck}
          onTryPaywallHopper={onTryPaywallHopper}
        />
      }
    />
  );
}
