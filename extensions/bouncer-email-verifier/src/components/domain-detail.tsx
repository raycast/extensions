import { Action, ActionPanel, Detail, Icon, Keyboard, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { BouncerError, verifyDomain, type DomainRecord } from "../lib/bouncer";
import { getDomainSignals, renderSignalLines } from "../lib/verdict";

const BOUNCER_APP_URL = "https://app.usebouncer.com";

export function DomainDetail({ domain, onChecked }: { domain: string; onChecked?: (record: DomainRecord) => void }) {
  const abortable = useRef<AbortController>(null);

  const { data, error, isLoading, revalidate } = usePromise(
    async (name: string) => verifyDomain(name, abortable.current?.signal),
    [domain],
    {
      abortable,
      onData: (record) => onChecked?.(record),
      onError: async (failure) => {
        const outOfCredits = failure instanceof BouncerError && failure.outOfCredits;
        const unauthorized = failure instanceof BouncerError && failure.statusCode === 401;

        await showToast({
          style: Toast.Style.Failure,
          title: outOfCredits ? "Out of Credits" : "Domain Check Failed",
          message: failure.message,
          primaryAction: unauthorized
            ? { title: "Open Preferences", onAction: () => openExtensionPreferences() }
            : undefined,
        });
      },
    },
  );

  if (error) {
    const outOfCredits = error instanceof BouncerError && error.outOfCredits;
    // The toast offers this too, but the view the user is left looking at must also lead somewhere.
    const unauthorized = error instanceof BouncerError && error.statusCode === 401;
    return (
      <Detail
        navigationTitle={domain}
        markdown={[
          `# ${outOfCredits ? "Out of Credits" : "Domain Check Failed"}`,
          "",
          `\`${domain}\``,
          "",
          error.message,
        ].join("\n")}
        actions={
          <ActionPanel>
            {outOfCredits ? (
              <Action.OpenInBrowser title="Top up Credits" url={BOUNCER_APP_URL} icon={Icon.Coins} />
            ) : null}
            {unauthorized ? (
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            ) : null}
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading || !data) {
    return <Detail isLoading navigationTitle={domain} markdown={`# Checking\n\n\`${domain}\``} />;
  }

  return <DomainRecordDetail record={data} onRetry={revalidate} />;
}

/**
 * A domain response carries no status, score or verdict — only the fields below. They are
 * reported as returned, with no summary inferred on top of them.
 */
export function DomainRecordDetail({ record, onRetry }: { record: DomainRecord; onRetry: () => void }) {
  const name = record.domain?.name ?? "Unknown domain";

  const markdown = [`# ${name}`, ""];
  markdown.push(...renderSignalLines(getDomainSignals(record)));
  if (record.dns?.record) {
    markdown.push("", `**${record.dns.type ?? "DNS"}** \`${record.dns.record}\``);
  }

  return (
    <Detail
      navigationTitle={name}
      markdown={markdown.join("\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Domain" text={name} />
          <Detail.Metadata.Label title="Provider" text={record.provider ?? "Not reported"} />
          <Detail.Metadata.Label
            title={record.dns?.type ? `DNS (${record.dns.type})` : "DNS"}
            text={record.dns?.record ?? "Not reported"}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Domain" content={name} icon={Icon.Globe} />
            <Action.CopyToClipboard
              title="Copy Summary"
              content={buildDomainSummary(record)}
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Check Again"
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

function buildDomainSummary(record: DomainRecord): string {
  return [
    record.domain?.name ?? "n/a",
    `Provider: ${record.provider ?? "n/a"}`,
    `${record.dns?.type ?? "DNS"}: ${record.dns?.record ?? "n/a"}`,
    ...getDomainSignals(record).map(({ label, value }) => `${label}: ${value}`),
  ].join("\n");
}
