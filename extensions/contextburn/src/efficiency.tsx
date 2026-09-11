import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { useEffect, useState } from "react";

type Efficiency = {
  sessions: number;
  tokens_total: number;
  output_tokens: number;
  reread_tokens: number;
  useful_share_tokens: number;
  reread_share_tokens: number;
  useful_share_cost: number;
  paid_tokens_per_useful_token: number;
  cost_usd: number;
  hours: number;
};

type Preferences = { command?: string; hours?: string };

// Raycast does not inherit the login shell PATH, so add the usual pip install locations.
const PATH = [
  `${homedir()}/.local/bin`,
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  process.env.PATH ?? "",
].join(":");

const millions = (n: number) => `${(n / 1e6).toFixed(1)}M`;

export default function Command() {
  const { command = "contextburn", hours = "5" } = getPreferenceValues<Preferences>();
  const [data, setData] = useState<Efficiency>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    execFile(command, ["--efficiency", hours], { env: { ...process.env, PATH }, timeout: 60000 }, (err, stdout) => {
      if (err) {
        setError(
          "The contextburn CLI was not found. Install it with `pip install contextburn`, or set its path in preferences.",
        );
        return;
      }
      try {
        setData(JSON.parse(stdout));
      } catch {
        setError("contextburn returned output that is not JSON.");
      }
    });
  }, [command, hours]);

  if (error) return <Detail markdown={`# contextburn\n\n${error}`} />;
  if (!data) return <Detail isLoading markdown="# contextburn\n\nReading local Claude Code transcripts…" />;
  if (!data.tokens_total)
    return <Detail markdown={`# contextburn\n\nNo Claude Code sessions in the last ${hours} h.`} />;

  const markdown = [
    `# ${data.useful_share_cost.toFixed(1)}% of cost was useful work`,
    "",
    `Last ${data.hours} h, ${data.sessions} sessions, ${millions(data.tokens_total)} tokens.`,
    "",
    `- **Context re-reading:** ${data.reread_share_tokens.toFixed(1)}% of tokens`,
    `- **Model output:** ${data.useful_share_tokens.toFixed(2)}% of tokens`,
    `- **One useful token costs** ${Math.round(data.paid_tokens_per_useful_token)} paid tokens`,
    "",
    "Counted locally from the transcripts Claude Code writes. Nothing leaves the machine.",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Useful work, cost-weighted" text={`${data.useful_share_cost.toFixed(1)}%`} />
          <Detail.Metadata.Label title="Useful work, tokens" text={`${data.useful_share_tokens.toFixed(2)}%`} />
          <Detail.Metadata.Label title="Context re-reading" text={`${data.reread_share_tokens.toFixed(1)}%`} />
          <Detail.Metadata.Label title="Sessions" text={String(data.sessions)} />
          <Detail.Metadata.Label title="Modeled cost" text={`$${data.cost_usd.toFixed(2)}`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Contextburn on GitHub" url="https://github.com/arsentev-ai/contextburn" />
          <Action.CopyToClipboard title="Copy JSON" content={JSON.stringify(data, null, 2)} />
        </ActionPanel>
      }
    />
  );
}
