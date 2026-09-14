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

export default function Command(props: { arguments?: { url?: string } }) {
  const [url, setUrl] = useState<string>("");
  const [cleaned, setCleaned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { removeReferralMarketing } = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function init() {
      try {
        const input =
          props.arguments?.url || (await Clipboard.readText()) || "";
        setUrl(input);

        const rules = await getRules();
        const result = await cleanUrl(input, rules, {
          removeReferralMarketing,
        });
        setCleaned(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [props.arguments?.url, removeReferralMarketing]);

  if (loading) {
    return <Detail markdown="Cleaning URL..." />;
  }

  if (error) {
    return <Detail markdown={`**Error:** ${error}`} />;
  }

  return (
    <Detail
      markdown={`**Original:** ${url || "-"}\n\n**Cleaned:** ${cleaned || "-"}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={cleaned || ""} />
          <Action.OpenInBrowser url={cleaned || ""} />
        </ActionPanel>
      }
    />
  );
}
