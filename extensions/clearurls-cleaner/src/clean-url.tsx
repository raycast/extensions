import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { cleanUrl } from "./clear-urls";
import { getRules } from "./cache";

interface Preferences {
  removeReferralMarketing?: boolean;
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function Command(props: { arguments: { url?: string } }) {
  const [originalUrl, setOriginalUrl] = useState<string>("");
  const [cleanedUrl, setCleanedUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [info, setInfo] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const inputUrl =
          props.arguments.url?.trim() ||
          (await Clipboard.readText())?.trim() ||
          "";
        if (cancelled) return;

        setOriginalUrl(inputUrl);

        if (!isValidHttpUrl(inputUrl)) {
          setInfo(
            "Please provide a valid HTTP(S) URL as an argument or on the clipboard.",
          );
          setIsLoading(false);
          return;
        }

        const rules = await getRules();
        if (cancelled) return;

        const prefs = getPreferenceValues<Preferences>();
        const cleaned = cleanUrl(inputUrl, rules.data, {
          removeReferralMarketing: prefs.removeReferralMarketing ?? true,
        });

        setCleanedUrl(cleaned);
        setInfo(
          `Rules source: ${rules.fromCache ? "cache" : "GitHub"} · updated ${new Date(
            rules.fetchedAt,
          ).toLocaleString()}`,
        );
      } catch (err) {
        setInfo(`Error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [props.arguments.url]);

  const markdown =
    originalUrl && cleanedUrl
      ? `## Original URL\n\`\`\`\n${originalUrl}\n\`\`\`\n\n## Cleaned URL\n\`\`\`\n${cleanedUrl}\n\`\`\`\n\n_${info}_`
      : `## ClearURLs Cleaner\n\nPaste a URL as an argument or copy one to the clipboard.\n\n${info}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {cleanedUrl && (
            <>
              <Action.CopyToClipboard
                content={cleanedUrl}
                title="Copy Cleaned URL"
              />
              <Action.OpenInBrowser url={cleanedUrl} title="Open Cleaned URL" />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
