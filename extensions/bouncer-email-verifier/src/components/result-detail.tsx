import { Action, ActionPanel, Detail, Icon, Keyboard, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { BouncerError, verifyEmail, type EmailRecord } from "../lib/bouncer";
import { formatReason, getEmailSignals, getVerdict, renderSignalLines, scoreColor } from "../lib/verdict";

const BOUNCER_APP_URL = "https://app.usebouncer.com";

type Props = {
  email: string;
  onVerified?: (record: EmailRecord) => void;
};

export function ResultDetail({ email, onVerified }: Props) {
  const abortable = useRef<AbortController>(null);

  const { data, error, isLoading, revalidate } = usePromise(
    async (address: string) => verifyEmail(address, abortable.current?.signal),
    [email],
    {
      abortable,
      onData: (record) => onVerified?.(record),
      onError: async (failure) => {
        const outOfCredits = failure instanceof BouncerError && failure.outOfCredits;
        const unauthorized = failure instanceof BouncerError && failure.statusCode === 401;

        await showToast({
          style: Toast.Style.Failure,
          title: outOfCredits ? "Out of Credits" : "Verification Failed",
          message: failure.message,
          primaryAction: unauthorized
            ? { title: "Open Preferences", onAction: () => openExtensionPreferences() }
            : undefined,
        });
      },
    },
  );

  if (error) {
    return <ErrorDetail email={email} error={error} onRetry={revalidate} />;
  }

  if (isLoading || !data) {
    return <Detail isLoading navigationTitle={email} markdown={`# Verifying\n\n\`${email}\``} />;
  }

  return <RecordDetail record={data} onRetry={revalidate} />;
}

export function RecordDetail({ record, onRetry }: { record: EmailRecord; onRetry: () => void }) {
  const verdict = getVerdict(record.status);

  return (
    <Detail
      navigationTitle={record.email}
      markdown={buildMarkdown(record)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={verdict.label} color={verdict.color} icon={verdict.icon} />
            {record.score === undefined ? null : (
              <Detail.Metadata.TagList.Item text={String(record.score)} color={scoreColor(record.score)} />
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Reason" text={formatReason(record.reason)} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Domain" text={record.domain?.name ?? "Not reported"} />
          <Detail.Metadata.Label title="Provider" text={record.provider ?? "Not reported"} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {record.didYouMean ? (
              <Action.Push
                title={`Verify ${record.didYouMean}`}
                icon={Icon.Wand}
                target={<ResultDetail email={record.didYouMean} />}
              />
            ) : null}
            <Action.CopyToClipboard title="Copy Email" content={record.email} icon={Icon.Envelope} />
            <Action.CopyToClipboard
              title="Copy Summary"
              content={buildSummary(record)}
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Verify Again"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRetry}
            />
            <Action.CopyToClipboard
              title="Copy Raw Response"
              content={JSON.stringify(record, null, 2)}
              icon={Icon.Code}
            />
            <Action.OpenInBrowser title="Open Bouncer Dashboard" url={BOUNCER_APP_URL} icon={Icon.Globe} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ErrorDetail({ email, error, onRetry }: { email: string; error: Error; onRetry: () => void }) {
  const outOfCredits = error instanceof BouncerError && error.outOfCredits;
  const unauthorized = error instanceof BouncerError && error.statusCode === 401;

  const markdown = [
    `# ${outOfCredits ? "Out of Credits" : "Verification Failed"}`,
    "",
    `\`${email}\``,
    "",
    error.message,
  ].join("\n");

  return (
    <Detail
      navigationTitle={email}
      markdown={markdown}
      actions={
        <ActionPanel>
          {outOfCredits ? (
            <Action.OpenInBrowser title="Top up Credits" url={BOUNCER_APP_URL} icon={Icon.Coins} />
          ) : null}
          {unauthorized ? (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          ) : null}
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(record: EmailRecord): string {
  const verdict = getVerdict(record.status);
  const lines = [`# ${verdict.label}`, "", `\`${record.email}\``, ""];

  if (record.score !== undefined) {
    lines.push(`\`${buildScoreBar(record.score)}\`  **${record.score}**`, "");
  }

  // Every signal Bouncer reported, with its reported value. Grouped three to a line:
  // a row per signal renders as a table that does not fit the default window height,
  // and markdown wraps rather than truncating, so nothing is lost at narrower widths.
  lines.push(...renderSignalLines(getEmailSignals(record)));

  if (record.dns?.record) {
    lines.push("", `**${record.dns.type ?? "DNS"}** \`${record.dns.record}\``);
  }

  if (record.didYouMean) {
    lines.push("", "---", "", `**Did you mean \`${record.didYouMean}\`?** Verify it from the actions below.`);
  }

  if (record.retryAfter) {
    lines.push(
      "",
      "---",
      "",
      `The mail server greylisted this check. Bouncer suggests retrying after ${record.retryAfter}.`,
    );
  }

  return lines.join("\n");
}

const SCORE_BAR_SEGMENTS = 20;

function buildScoreBar(score: number): string {
  const filled = Math.round((Math.max(0, Math.min(100, score)) / 100) * SCORE_BAR_SEGMENTS);
  return `${"█".repeat(filled)}${"░".repeat(SCORE_BAR_SEGMENTS - filled)}`;
}

function buildSummary(record: EmailRecord): string {
  return [
    `${record.email} — ${getVerdict(record.status).label}`,
    `Score: ${record.score ?? "n/a"}`,
    `Reason: ${formatReason(record.reason)}`,
    `Domain: ${record.domain?.name ?? "n/a"} · Provider: ${record.provider ?? "n/a"}`,
    ...getEmailSignals(record).map(({ label, value }) => `${label}: ${value}`),
  ].join("\n");
}
