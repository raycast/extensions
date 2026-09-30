import { showError } from "@chrismessina/raycast-kit";
import { countOf } from "@chrismessina/raycast-kit/plural";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  Keyboard,
  LaunchType,
  List,
  Toast,
  launchCommand,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";

import { GalleryActionSection } from "./actions/gallery";
import { HookSetupDetail } from "./components/hook-setup";
import { SETTINGS_PATHS, SETUP_PROMPT, updatePrompt } from "./utils/hook-status";
import { HOOK_LOG_PATH, backfill, diagnose, diagnosticsReport } from "./utils/doctor";
import { INDEX_PATH } from "./utils/index-file";
import type { Artifact } from "./types/artifact";
import type { Check, CheckState, Diagnosis } from "./utils/doctor";

/**
 * Backfill has no `Keyboard.Shortcut.Common` member — it is neither a refresh
 * (that is re-running the checks, which owns `Common.Refresh`) nor a save. ⌘⇧R
 * is free against all 17 `Common` bindings and reads as "the bigger refresh".
 */
const BACKFILL_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "r" };

const STATE_ICON: Record<CheckState, Image.ImageLike> = {
  ok: { source: Icon.CheckCircle, tintColor: Color.Green },
  warn: { source: Icon.Warning, tintColor: Color.Yellow },
  fail: { source: Icon.XMarkCircle, tintColor: Color.Red },
  unknown: { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText },
};

/** Searchable words for each state, so "broken" finds the failing checks. */
const STATE_KEYWORDS: Record<CheckState, string[]> = {
  ok: ["ok", "passing", "healthy"],
  warn: ["warn", "warning", "attention"],
  fail: ["fail", "failing", "broken", "error"],
  unknown: ["unknown", "undetermined"],
};

/**
 * Repair actions, repeated on every row.
 *
 * A diagnostics screen is read top to bottom and acted on from wherever the
 * cursor happens to be, so these cannot live on one privileged row — a fix
 * reachable only from the row that reported the problem is a fix the user has
 * to hunt for.
 */
function DoctorActions({
  diagnosis,
  revalidate,
  onBackfill,
}: {
  diagnosis?: Diagnosis;
  revalidate: () => void;
  onBackfill: () => void;
}) {
  const missing = diagnosis?.missing.length ?? 0;
  const allPassing = diagnosis !== undefined && diagnosis.checks.every((check) => check.state === "ok");

  return (
    <ActionPanel.Section title="Doctor">
      {/*
        With nothing to fix, re-running the checks is the least useful thing on
        offer — it costs a four-second transcript scan to redraw six green
        ticks. The reason you came here was to get the list working, so the
        default becomes going to the list. Refresh stays on ⌘R for the case
        where you fixed something outside Raycast and want to confirm it.

        `launchCommand` rather than a `raycast://` deeplink: same destination,
        but it stays inside Raycast instead of round-tripping through the URL
        handler, and it fails loudly here if the command is disabled rather
        than silently doing nothing.
      */}
      {allPassing ? (
        <Action
          title="Search Artifacts"
          icon={Icon.MagnifyingGlass}
          onAction={async () => {
            try {
              await launchCommand({ name: "search-artifacts", type: LaunchType.UserInitiated });
            } catch (error) {
              await showError(error, { title: "Could Not Open Search Artifacts" });
            }
          }}
        />
      ) : null}
      {missing > 0 && diagnosis?.canBackfill ? (
        <Action
          title={`Backfill ${countOf(missing, "Missing Artifact")}`}
          icon={Icon.Download}
          shortcut={BACKFILL_SHORTCUT}
          onAction={onBackfill}
        />
      ) : null}
      <Action
        title="Run Checks Again"
        icon={Icon.Repeat}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      {diagnosis ? (
        <Action.CopyToClipboard
          title="Copy Diagnostics Report"
          icon={Icon.Clipboard}
          content={diagnosticsReport(diagnosis)}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      ) : null}
      {/*
        Gated on the file existing. `ShowInFinder` on an absent path fails at
        press time with a generic error, which on a diagnostics screen reads as
        the diagnostics being broken rather than as the log never having been
        written.
      */}
      {diagnosis?.hookLogExists ? (
        <Action.ShowInFinder title="Show Hook Log" icon={Icon.Document} path={HOOK_LOG_PATH} />
      ) : null}
      <Action.CopyToClipboard
        title="Copy Index Path"
        icon={Icon.Finder}
        content={INDEX_PATH}
        shortcut={Keyboard.Shortcut.Common.CopyPath}
      />
    </ActionPanel.Section>
  );
}

/**
 * The action that resolves this particular check, as the Enter default.
 *
 * Only checks with a mechanical remedy get one. A check whose fix is "install
 * jq" has nothing to offer here, and a placeholder action that explains rather
 * than acts is worse than none — it consumes Enter.
 */
function RemedyActions({ check, scriptPath }: { check: Check; scriptPath: string }) {
  switch (check.remedyKind) {
    case "setup":
      return (
        <ActionPanel.Section>
          <Action.Push title="Set up Artifact Tracking" icon={Icon.Plug} target={<HookSetupDetail />} />
          <Action.CopyToClipboard title="Copy Setup Prompt" icon={Icon.Clipboard} content={SETUP_PROMPT} />
        </ActionPanel.Section>
      );

    case "unblock":
      // Deliberately NOT the setup flow. The hook is already registered and a
      // kill switch is what stops it, so running setup would append a SECOND
      // registration — every future publish recorded twice — while leaving the
      // switch that caused the problem untouched.
      return (
        <ActionPanel.Section>
          <Action.CopyToClipboard
            title="Copy Settings Path"
            icon={Icon.Finder}
            content={SETTINGS_PATHS[0]}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        </ActionPanel.Section>
      );

    case "update-script":
      // The UPDATE prompt, naming the script the registration actually points
      // at — the setup prompt would add a duplicate registration, and a
      // hardcoded path would repair a file this install does not use.
      return (
        <ActionPanel.Section>
          <Action.CopyToClipboard
            title="Copy Hook Update Prompt"
            icon={Icon.Clipboard}
            content={updatePrompt(scriptPath)}
          />
        </ActionPanel.Section>
      );

    case "show-index":
      return (
        <ActionPanel.Section>
          <Action.ShowInFinder path={INDEX_PATH} />
        </ActionPanel.Section>
      );

    default:
      return null;
  }
}

function checkMarkdown(check: Check): string {
  return [`## ${check.title}`, "", check.detail, ...(check.remedy ? ["", `**Fix —** ${check.remedy}`] : [])].join("\n");
}

function artifactMarkdown(artifact: Artifact): string {
  return [
    `## ${artifact.title}`,
    "",
    `[${artifact.url}](${artifact.url})`,
    "",
    `Published ${artifact.updated ?? "on an unknown date"}${artifact.cwd ? ` from \`${artifact.cwd}\`` : ""}.`,
  ].join("\n");
}

export default function Doctor() {
  const { data: diagnosis, isLoading, revalidate, mutate } = useCachedPromise(diagnose, [], { keepPreviousData: true });

  // The action stays pressable while the write is in flight, and the toast is
  // the only feedback — so a second press before revalidation finishes would
  // run the same captured rows again. The lock keeps that safe, but it still
  // writes a second backup and reports rows as "Added" that the first run had
  // already merged.
  const backfilling = useRef(false);

  async function onBackfill() {
    const missing = diagnosis?.missing ?? [];
    if (missing.length === 0 || backfilling.current) return;
    backfilling.current = true;

    // Fired BEFORE the write starts. The backfill takes the recorder's lock and
    // then re-runs every check, so there is a visible gap where nothing appears
    // to happen; without this the action reads as a no-op and gets pressed
    // twice, which would take the lock twice.
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Adding ${countOf(missing.length, "artifact")}…`,
    });

    try {
      // Through `mutate` so the checks re-run automatically — the point of the
      // action is that the warning clears without a second keystroke.
      const result = await mutate(backfill(missing));
      toast.style = Toast.Style.Success;
      toast.title = `Added ${countOf(result.added, "artifact")}`;
      toast.message = `Previous index saved to ${result.backupPath}`;
    } catch (error) {
      await toast.hide();
      await showError(error, { title: "Backfill Failed" });
    } finally {
      backfilling.current = false;
    }
  }

  // A progress toast for the whole run, the way `brew doctor` does it.
  //
  // The list's own loading bar is a hairline at the top of an empty window, and
  // the transcript scan takes about four seconds against a few thousand
  // sessions — long enough that the first launch reads as a command that opened
  // to nothing and stalled.
  //
  // Ownership is per-effect-run, not global. A toast handle carries no identity,
  // so a bare `hide()` in cleanup can dismiss a LATER toast that replaced this
  // one; the `canceled` flag plus the locally-scoped handle mean each run only
  // ever hides the toast it created, including when `showToast` resolves after
  // the scan already finished.
  useEffect(() => {
    // Backfill shows its own toast and then revalidates. Without this guard the
    // revalidation's toast would immediately paint over "Adding N artifacts…".
    if (!isLoading || backfilling.current) return;

    let canceled = false;
    let handle: Toast | undefined;

    showToast({ style: Toast.Style.Animated, title: "Running Doctor…" }).then((toast) => {
      if (canceled) void toast.hide();
      else handle = toast;
    });

    return () => {
      canceled = true;
      void handle?.hide();
    };
  }, [isLoading]);

  const needAttention = diagnosis?.checks.filter((c) => c.state !== "ok").length ?? 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={diagnosis !== undefined}
      navigationTitle="Claude Artifacts Doctor"
      searchBarPlaceholder="Filter checks"
      actions={
        <ActionPanel>
          <DoctorActions diagnosis={diagnosis} revalidate={revalidate} onBackfill={onBackfill} />
          <GalleryActionSection />
        </ActionPanel>
      }
    >
      {/*
        Only reachable while the first run is in flight — `keepPreviousData`
        means a re-run keeps the previous checks on screen instead of blanking
        the list.
      */}
      <List.EmptyView
        icon={Icon.Heartbeat}
        title="Running Checks"
        description="Reading your Claude Code settings, exercising the recording hook, and scanning transcripts."
      />

      {diagnosis ? (
        <List.Section title="Checks" subtitle={needAttention === 0 ? "All passing" : `${needAttention} to fix`}>
          {diagnosis.checks.map((check) => (
            <List.Item
              key={check.id}
              icon={STATE_ICON[check.state]}
              title={check.title}
              keywords={STATE_KEYWORDS[check.state]}
              detail={<List.Item.Detail markdown={checkMarkdown(check)} />}
              actions={
                <ActionPanel>
                  <RemedyActions check={check} scriptPath={diagnosis.scriptPath} />
                  <DoctorActions diagnosis={diagnosis} revalidate={revalidate} onBackfill={onBackfill} />
                  <GalleryActionSection />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {/*
        Section headings are short by necessity, not by taste. With the detail
        pane open the list column is about 20 characters wide: "Missing from
        the Index" truncated to "Missing from the I…" and its counted subtitle
        wrapped onto two lines. The transcript count lives in the Index
        Coverage detail, where there is room for it.
      */}
      {diagnosis && diagnosis.missing.length > 0 ? (
        <List.Section title="Not Indexed" subtitle={`${diagnosis.missing.length}`}>
          {diagnosis.missing.map((artifact) => (
            <List.Item
              key={artifact.id}
              icon={{ source: Icon.Plus, tintColor: Color.Yellow }}
              title={artifact.title}
              detail={<List.Item.Detail markdown={artifactMarkdown(artifact)} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open Artifact" url={artifact.url} />
                  <DoctorActions diagnosis={diagnosis} revalidate={revalidate} onBackfill={onBackfill} />
                  <GalleryActionSection />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
