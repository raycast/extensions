/**
 * Doctor command — `brew doctor --json` (Homebrew 7) as one Detail.
 *
 * brew's report is prose, not a list: the same sentence covers every command it
 * recommends, so a row per command repeated it. The whole report is rendered as
 * Markdown instead, with one Fix All that runs every recommended command in
 * report order behind a single confirmation. Commands run verbatim through the
 * shell — they are not always `brew …`; a permissions finding remediates with
 * `sudo chown`/`chmod` — and the confirmation lists every one.
 */

import { useMemo } from "react";
import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HomebrewGate } from "./components/requiresHomebrew";
import { RefreshAction } from "./components/actionPanels";
import { useTerminalApp } from "./utils/terminal";
import { useBrewDoctor } from "./hooks/useBrewDoctor";
import {
  doctorReportMarkdown,
  worstTier,
  getErrorMessage,
  tierLabel,
  confirmAndRun,
  HOMEBREW_7,
  type DoctorTier,
} from "./utils";

const SUPPORT_TIERS_URL = "https://docs.brew.sh/Support-Tiers";

export default function Main() {
  return (
    <ErrorBoundary>
      <HomebrewGate major={HOMEBREW_7} feature="Run Doctor" loading={<Detail isLoading />}>
        <DoctorContent />
      </HomebrewGate>
    </ErrorBoundary>
  );
}

function supportTiersUrl(tier: DoctorTier): string {
  return tier === "unsupported" ? `${SUPPORT_TIERS_URL}#unsupported` : `${SUPPORT_TIERS_URL}#tier-${tier}`;
}

function DoctorContent() {
  const { data, isLoading, error, revalidate } = useBrewDoctor();
  const { terminalName, terminalIcon, runCommandInTerminal } = useTerminalApp();

  const markdown = data ? doctorReportMarkdown(data) : "";
  // Every command brew recommends, in brew's own report order — the same order
  // the rendered document lists them in.
  const allCommands = (data?.findings ?? []).flatMap((f) => f.remediation?.commands ?? []);
  const hasFixes = allCommands.length > 0;
  // The worst tier present, which is what the report as a whole is gated by.
  const tier = worstTier(data?.findings ?? []);
  // The run this view is showing — not "now", which would tick on every render.
  const checkedAt = useMemo(() => new Date().toLocaleTimeString(), [data]);

  if (isLoading && !data) {
    return <Detail isLoading />;
  }

  // The hook already showed a failure toast with Copy Logs.
  if (error && !data) {
    return (
      <Detail
        markdown={`# Doctor failed\n\n\`\`\`\n${getErrorMessage(error)}\n\`\`\``}
        actions={
          <ActionPanel>
            <RefreshAction onRefresh={revalidate} />
          </ActionPanel>
        }
      />
    );
  }

  if (!data || data.findings.length === 0) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={"# Your system is ready to brew\n\n`brew doctor` found nothing to fix."}
        actions={
          <ActionPanel>
            <RefreshAction onRefresh={revalidate} />
            <Action.OpenInBrowser
              title="Open Support Tiers"
              url={SUPPORT_TIERS_URL}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          </ActionPanel>
        }
      />
    );
  }

  const fixAll = async () => {
    // One failing command (a cask disabled upstream, say) must not strand the
    // rest: run them all, then report the failures together.
    const ok = await confirmAndRun(allCommands, {
      title: "Fix All Findings",
      message: "Run every command brew recommends?",
      toastTitle: "Fix All",
      continueOnError: true,
    });
    if (ok) revalidate();
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Support Tier" text={tierLabel(tier)} target={supportTiersUrl(tier)} />
          <Detail.Metadata.Label title="Findings" text={String(data.findings.length)} />
          <Detail.Metadata.Label title="Fixes" text={String(allCommands.length)} />
          <Detail.Metadata.Label title="Checked" text={checkedAt} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {hasFixes && <Action title="Fix All" icon={Icon.Hammer} onAction={fixAll} />}
            {hasFixes && (
              <Action
                title={`Fix All in ${terminalName}`}
                icon={terminalIcon}
                shortcut={Keyboard.Shortcut.Common.OpenWith}
                onAction={() => runCommandInTerminal(allCommands.join(" && "))}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {hasFixes && (
              <Action.CopyToClipboard
                title="Copy Fix Commands"
                content={allCommands.join("\n")}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            )}
            {/* No Common member means "copy this whole document"; CopyName's ⌘⌥C is the
                free binding next to Copy Fix Commands' ⌘⇧C. */}
            <Action.CopyToClipboard
              title="Copy Report"
              content={markdown}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open Support Tiers"
              url={supportTiersUrl(tier)}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <RefreshAction onRefresh={revalidate} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
