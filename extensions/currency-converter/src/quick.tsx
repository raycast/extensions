import { Action, ActionPanel, Detail, Icon, LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { formatAmount, getCurrency } from "./currencies";
import { formatRelativeTime, getPrefs, getRates, InvalidApiKeyError, MissingApiKeyError } from "./api";
import NoApiKey from "./NoApiKey";

type Args = { amount: string; from?: string; to?: string };

export default function QuickConvert(props: LaunchProps<{ arguments: Args }>) {
  const prefs = getPrefs();
  const rawAmount = props.arguments.amount?.trim() ?? "";
  const from = (props.arguments.from || prefs.defaultFrom).toUpperCase();
  const to = (props.arguments.to || prefs.defaultTo).toUpperCase();

  const [markdown, setMarkdown] = useState<string>("Loading…");
  const [loading, setLoading] = useState<boolean>(true);
  const [convertedText, setConvertedText] = useState<string>("");
  const [fullText, setFullText] = useState<string>("");
  const [keyState, setKeyState] = useState<"ok" | "missing" | "invalid">("ok");

  useEffect(() => {
    void run();
  }, []);

  async function run() {
    const parsed = Number(rawAmount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setMarkdown(`# ⚠ Invalid amount\n\nCould not parse \`${rawAmount}\` as a number.`);
      setLoading(false);
      return;
    }
    if (!getCurrency(from)) {
      setMarkdown(`# ⚠ Unsupported currency\n\n\`${from}\` is not in the supported list.`);
      setLoading(false);
      return;
    }
    if (!getCurrency(to)) {
      setMarkdown(`# ⚠ Unsupported currency\n\n\`${to}\` is not in the supported list.`);
      setLoading(false);
      return;
    }

    try {
      const data = await getRates(from);
      const rate = from === to ? 1 : data.rates[to];
      if (!rate) {
        setMarkdown(`# ⚠ Rate unavailable\n\nNo rate for ${from} → ${to}.`);
        setLoading(false);
        return;
      }
      const converted = parsed * rate;
      const fromC = getCurrency(from)!;
      const toC = getCurrency(to)!;

      setConvertedText(converted.toFixed(2));
      setFullText(`${formatAmount(parsed, from)} = ${formatAmount(converted, to)}`);

      const md = [
        `# ${formatAmount(parsed, from)}  =  **${formatAmount(converted, to)}**`,
        ``,
        `${fromC.flag} ${fromC.name} → ${toC.flag} ${toC.name}`,
        ``,
        `---`,
        ``,
        `**Rate:** 1 ${from} = ${rate.toFixed(6)} ${to}`,
        ``,
        `**Inverse:** 1 ${to} = ${(1 / rate).toFixed(6)} ${from}`,
        ``,
        `**Updated:** ${formatRelativeTime(data.fetchedAt)}`,
      ].join("\n");
      setMarkdown(md);
    } catch (e) {
      if (e instanceof MissingApiKeyError) {
        setKeyState("missing");
        setLoading(false);
        return;
      }
      if (e instanceof InvalidApiKeyError) {
        setKeyState("invalid");
        setLoading(false);
        return;
      }
      const msg = e instanceof Error ? e.message : String(e);
      setMarkdown(`# ⚠ Error\n\n${msg}`);
      await showToast({ style: Toast.Style.Failure, title: "Failed to fetch rates", message: msg });
    } finally {
      setLoading(false);
    }
  }

  if (keyState !== "ok") {
    return <NoApiKey invalid={keyState === "invalid"} />;
  }

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {convertedText && (
            <>
              <Action.CopyToClipboard title="Copy Converted Value" content={convertedText} />
              <Action.CopyToClipboard
                title="Copy Full Result"
                content={fullText}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </>
          )}
          <Action
            title="Refresh Rates"
            icon={Icon.ArrowClockwise}
            onAction={() => {
              setLoading(true);
              void run();
            }}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
