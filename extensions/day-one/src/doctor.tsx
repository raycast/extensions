import { ReactNode, useEffect, useRef, useState } from "react";
import { basename } from "node:path";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Icon,
  openExtensionPreferences,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { announceRebuild } from "./lib/use-rebuild-news";
import { AgentSkillsHelp } from "./components/agent-skills-help";
import { EncryptionKeyForm, SignInForm } from "./components/auth-forms";
import {
  Account,
  DoctorReport,
  Journal,
  listJournals,
  logout,
  runDoctor,
  ScheduleStatus,
  scheduleStatus,
  setSchedule,
  setTelemetry,
  TelemetryStatus,
  telemetryStatus,
  whoami,
} from "./lib/api";
import {
  CLI_DOCS_URL,
  CliInfo,
  ensureSearchModel,
  findCli,
  INSTALL_COMMAND,
  IS_WINDOWS,
  isSearchModelDownloaded,
  SEARCHES_BY_MEANING,
} from "./lib/cli";
import { errorMessage, failToast, progressMessage, syncWithToast } from "./lib/feedback";
import { canSignOut, MIN_CLI_VERSION, plural, SyncProgress } from "./lib/parse";
import {
  agentSkillsInstalled,
  installAgentSkills,
  installCli,
  legacyCliState,
  LegacyState,
  legacyMcpConfigs,
  McpConfigFinding,
  RENAME_COMMAND,
  renameLegacyCli,
  RENAMED_LEGACY_CLI_PATH,
  SKILLS_COMMAND,
  SKILLS_REPO_URL,
  updateCli,
} from "./lib/setup";
import { isSyncRunning, readProgress, rebuildStatus, RebuildProgress, RebuildStatus, startRebuild } from "./lib/sync";

const log = logger.child("[doctor]");

type Health = {
  legacy: LegacyState;
  mcp: McpConfigFinding[];
  cli?: CliInfo;
  cliError?: unknown;
  account?: Account;
  report?: DoctorReport;
  journals?: Journal[];
  telemetry?: TelemetryStatus;
  schedule?: ScheduleStatus;
  problems: string[];
};

async function loadHealth(): Promise<Health> {
  const legacy = legacyCliState();
  const mcp = legacyMcpConfigs();
  let cli: CliInfo;
  try {
    cli = await findCli(true);
  } catch (cliError) {
    log.warn("CLI not usable", { legacy, error: errorMessage(cliError) });
    return { legacy, mcp, cliError, problems: [] };
  }
  // Every other check runs the CLI, which refuses to run while outdated; the CLI row offers the update.
  if (cli.outdated) return { legacy, mcp, cli, problems: [] };
  const [account, report, journals, telemetry, schedule] = await Promise.allSettled([
    whoami(),
    runDoctor(),
    listJournals(),
    telemetryStatus(),
    scheduleStatus(),
  ]);
  const value = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : undefined);
  const problems = [account, report, journals, telemetry, schedule]
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => errorMessage(r.reason));
  log.debug("checked", {
    cli: cli.version,
    legacy,
    mcpConfigs: mcp.length,
    signedIn: value(account)?.signedIn,
    plan: value(account)?.plan,
    cliDoctor: value(report)?.status,
    failingChecks: value(report)
      ?.checks.filter((c) => c.status !== "pass")
      .map((c) => c.check),
    journals: value(journals)?.length,
    problems: problems.length,
  });
  return {
    legacy,
    mcp,
    cli,
    account: value(account),
    report: value(report),
    journals: value(journals),
    telemetry: value(telemetry),
    schedule: value(schedule),
    problems,
  };
}

/**
 * Sign-out deletes the CLI's local database, so it must never run while anything is waiting to upload.
 * The count shown in the list can be stale (an entry saved since), so it is read again right before deleting,
 * and anything other than a confirmed zero blocks it.
 */
async function signOutSafely(): Promise<void> {
  if (isSyncRunning()) throw new Error("A sync is running. Try again when it finishes");
  const fresh = await runDoctor();
  const total = detail(fresh, "outbox", "total");
  if (!canSignOut(total)) {
    throw new Error(
      typeof total === "number" && total > 0
        ? `${plural(total, "change")} not uploaded yet. Sync, then sign out`
        : "Couldn't confirm that every change has uploaded",
    );
  }
  await logout();
}

const ok = { source: Icon.CheckCircle, tintColor: Color.Green };
const todo = { source: Icon.Circle, tintColor: Color.Orange };
const warn = { source: Icon.Warning, tintColor: Color.Orange };
const bad = { source: Icon.XMarkCircle, tintColor: Color.Red };
const off = { source: Icon.MinusCircle, tintColor: Color.SecondaryText };

function detail(report: DoctorReport | undefined, check: string, key: string): unknown {
  return report?.checks.find((c) => c.check === check)?.details?.[key];
}

function ago(seconds: number): string {
  if (seconds < 90) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${plural(minutes, "minute")} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${plural(hours, "hour")} ago`;
  return `${plural(Math.round(hours / 24), "day")} ago`;
}

/** How each `dayone doctor` check status shows; anything else is a warning. */
const CHECK_ICONS: Record<string, typeof ok> = { pass: ok, fail: bad, not_run: off };

type LocalState = {
  syncProgress: SyncProgress | null;
  rebuild: RebuildStatus;
  modelDownloaded: boolean;
  skillsInstalled: boolean;
};

/** What Doctor shows that lives in files on this computer, not in the CLI: read once per tick, not per render. */
function readLocalState(): LocalState {
  return {
    syncProgress: isSyncRunning() ? readProgress() : null,
    rebuild: rebuildStatus(),
    modelDownloaded: isSearchModelDownloaded(),
    skillsInstalled: agentSkillsInstalled(),
  };
}

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(loadHealth, [], {
    onError: (error) => failToast(error, "Couldn't Check Day One"),
  });
  const busy = useRef(false);
  const { push } = useNavigation();
  const [local, setLocal] = useState<LocalState>(readLocalState);
  const { syncProgress, rebuild, modelDownloaded, skillsInstalled } = local;

  /** Re-reads this computer's state; a render happens only when something changed. */
  function refreshLocal(): LocalState {
    const next = readLocalState();
    setLocal((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    return next;
  }

  // Show a sync or rebuild started anywhere (the Sync command, a saved entry, an earlier visit) while this view is open.
  useEffect(() => {
    const tick = () => {
      const { rebuild } = refreshLocal();
      announceRebuild(rebuild);
      void showRebuildProgress(rebuild);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // While a rebuild runs and this view is open, one toast counts it up; the "Search Index Rebuilt" toast replaces it.
  const rebuildToast = useRef<Promise<Toast> | null>(null);
  // Set when another action takes the toast, so the rebuild's progress updates don't cover that action's result.
  const rebuildToastYielded = useRef(false);
  async function showRebuildProgress(status: RebuildStatus) {
    if (status.state !== "running") {
      rebuildToast.current = null;
      rebuildToastYielded.current = false;
      return;
    }
    if (rebuildToastYielded.current) return;
    const message = rebuildProgressText(status.progress);
    // Stored as a promise so a tick that lands while the toast is still opening doesn't open a second one.
    if (rebuildToast.current) {
      const toast = await rebuildToast.current;
      if (toast.message !== message) toast.message = message;
    } else
      rebuildToast.current = showToast({ style: Toast.Style.Animated, title: "Rebuilding Search Index…", message });
  }

  /** One action at a time: a second Enter while a toast is up must not start the same install twice. */
  async function run(
    title: string,
    work: () => Promise<unknown>,
    done: string,
    extras: { message?: string; then?: Toast.ActionOptions } = {},
  ) {
    if (busy.current) return;
    busy.current = true;
    rebuildToastYielded.current = true;
    log.debug("action started", { title });
    const toast = await showToast({ style: Toast.Style.Animated, title, message: extras.message });
    try {
      await work();
      toast.style = Toast.Style.Success;
      toast.title = done;
      toast.message = undefined;
      toast.primaryAction = extras.then;
      log.debug("action finished", { title: done });
      revalidate();
    } catch (error) {
      if (errorMessage(error) === "Canceled") {
        toast.style = Toast.Style.Success;
        toast.title = "Canceled";
      } else {
        await failToast(error, `${title.replace(/…$/, "")} Failed`, toast);
      }
    } finally {
      busy.current = false;
    }
  }

  const sync = async () => {
    rebuildToastYielded.current = true;
    await syncWithToast();
    revalidate();
  };

  const reportAction = data?.report && (
    <Action.CopyToClipboard
      title="Copy Doctor Report"
      content={JSON.stringify(data.report, null, 2)}
      shortcut={Keyboard.Shortcut.Common.Copy}
    />
  );

  const common = (
    <ActionPanel.Section>
      <Action
        title="Check Again"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      {reportAction}
    </ActionPanel.Section>
  );

  if (!data) return <List isLoading={isLoading} searchBarPlaceholder="Checking Day One…" />;

  const { cli, report, account } = data;
  const signedIn = account?.signedIn ?? false;
  // An outdated CLI refuses every command, so nothing past the update is offered until it's updated.
  const usable = Boolean(cli && !cli.outdated);
  const keySource = detail(report, "session_encryption", "key_source");
  const hasKey = typeof keySource === "string" && keySource !== "missing";
  // Unknown (journals didn't load) is treated as "may need one", never as "none needed".
  const needsKey = data.journals ? data.journals.some((j) => j.encrypted) : true;
  const lastSyncAge = detail(report, "sync", "last_success_age_seconds");
  const entries = detail(report, "local_scale", "entries");
  const outbox = Number(detail(report, "outbox", "total") ?? 0);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter checks…">
      <List.Section title="Setup">
        {data.legacy === "present" && (
          <List.Item
            icon={warn}
            title="Rename the Legacy Mac CLI"
            subtitle="The old Mac app's dayone takes the name the new CLI needs"
            actions={
              <ActionPanel>
                <Action
                  title="Rename for Me"
                  icon={Icon.Pencil}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Rename the Legacy CLI?",
                      message: `This moves /usr/local/bin/dayone to ${RENAMED_LEGACY_CLI_PATH}, as Day One recommends. macOS asks for your password.`,
                      primaryAction: { title: "Rename" },
                    });
                    if (confirmed)
                      await run("Renaming Legacy CLI…", renameLegacyCli, "Legacy CLI Renamed to dayone-mac");
                  }}
                />
                <Action.CopyToClipboard title="Copy Rename Command" content={RENAME_COMMAND} />
                {common}
              </ActionPanel>
            }
          />
        )}
        {data.legacy === "renamed" && (
          <List.Item
            icon={ok}
            title="Legacy Mac CLI Renamed"
            subtitle="Available as dayone-mac"
            actions={<ActionPanel>{common}</ActionPanel>}
          />
        )}

        {cli ? (
          <List.Item
            icon={cli.outdated ? warn : ok}
            title={cli.outdated ? "Update the Day One CLI" : "Day One CLI Installed"}
            subtitle={cli.outdated ? `Version ${MIN_CLI_VERSION} or newer is needed` : `Version ${cli.version}`}
            accessories={[{ text: cli.version, tooltip: cli.path }]}
            actions={
              <ActionPanel>
                <Action
                  title="Update for Me"
                  icon={Icon.Download}
                  onAction={() => run("Updating Day One CLI…", updateCli, "Day One CLI Updated")}
                />
                <Action.ShowInFinder path={cli.path} shortcut={Keyboard.Shortcut.Common.Open} />
                <Action.OpenInBrowser title="Open CLI Docs" url={CLI_DOCS_URL} />
                {common}
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            icon={todo}
            title="Install the Day One CLI"
            subtitle={
              data.legacy === "present"
                ? "Rename the legacy CLI first"
                : data.cliError && errorMessage(data.cliError).includes("preferences")
                  ? errorMessage(data.cliError)
                  : `Runs ${INSTALL_COMMAND}`
            }
            actions={
              <ActionPanel>
                <Action
                  title="Install for Me"
                  icon={Icon.Download}
                  onAction={() => run("Installing Day One CLI…", installCli, "Day One CLI Installed")}
                />
                <Action.CopyToClipboard title="Copy Install Command" content={INSTALL_COMMAND} />
                <Action.OpenInBrowser title="Open CLI Docs" url={CLI_DOCS_URL} />
                {data.cliError !== undefined && (
                  <Action
                    title="Copy Error"
                    icon={Icon.Clipboard}
                    onAction={() => Clipboard.copy(errorMessage(data.cliError))}
                  />
                )}
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                {common}
              </ActionPanel>
            }
          />
        )}

        {usable && (
          <List.Item
            icon={signedIn ? ok : todo}
            title={signedIn ? `Signed In${account?.name ? ` as ${account.name}` : ""}` : "Sign In to Day One"}
            subtitle={signedIn ? undefined : "With your Day One email and password"}
            accessories={
              account?.plan ? [{ tag: account.plan[0].toUpperCase() + account.plan.slice(1), tooltip: "Plan" }] : []
            }
            actions={
              <ActionPanel>
                {signedIn && common}
                {signedIn ? (
                  <Action
                    title="Sign out"
                    icon={Icon.Logout}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: "Sign Out of Day One?",
                        message:
                          "This deletes the CLI's copy of your journals on this computer. Your journals stay in Day One.",
                        primaryAction: { title: "Sign Out", style: Alert.ActionStyle.Destructive },
                      });
                      if (confirmed) await run("Signing Out…", signOutSafely, "Signed Out");
                    }}
                  />
                ) : (
                  <Action.Push title="Sign in" icon={Icon.Person} target={<SignInForm onDone={revalidate} />} />
                )}
                {!signedIn && common}
              </ActionPanel>
            }
          />
        )}

        {cli && signedIn && (
          <List.Item
            icon={hasKey ? ok : needsKey ? todo : off}
            title={hasKey ? "Encryption Key Saved" : needsKey ? "Add Your Encryption Key" : "No Encryption Key"}
            subtitle={
              hasKey
                ? IS_WINDOWS
                  ? "In Windows Credential Manager"
                  : "In your keychain"
                : needsKey
                  ? "Needed to read your encrypted journals"
                  : "None of your journals need one"
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title={hasKey ? "Replace Encryption Key" : "Add Encryption Key"}
                  icon={Icon.Key}
                  target={<EncryptionKeyForm onDone={revalidate} />}
                />
                {common}
              </ActionPanel>
            }
          />
        )}

        {cli && signedIn && (
          <List.Item
            icon={
              syncProgress
                ? { source: Icon.CircleProgress, tintColor: Color.Blue }
                : typeof lastSyncAge === "number"
                  ? ok
                  : todo
            }
            title={
              syncProgress
                ? "Syncing…"
                : typeof lastSyncAge === "number"
                  ? `Synced ${ago(lastSyncAge)}`
                  : "Run Your First Sync"
            }
            subtitle={
              syncProgress
                ? progressMessage(syncProgress)
                : typeof entries === "number"
                  ? `${plural(entries, "entry", "entries")} on this computer`
                  : "A large account can take a few minutes"
            }
            accessories={
              outbox > 0 ? [{ tag: { value: `${plural(outbox, "change")} to upload`, color: Color.Orange } }] : []
            }
            actions={
              <ActionPanel>
                <Action title="Sync Now" icon={Icon.ArrowClockwise} onAction={sync} />
                {common}
              </ActionPanel>
            }
          />
        )}

        {cli && signedIn && !SEARCHES_BY_MEANING && (
          <List.Item
            icon={off}
            title="Search Matches Words"
            subtitle="The Windows CLI has no search model, so search finds exact words, not meaning"
            actions={<ActionPanel>{common}</ActionPanel>}
          />
        )}

        {cli && signedIn && SEARCHES_BY_MEANING && (
          <List.Item
            icon={modelDownloaded ? ok : todo}
            title={modelDownloaded ? "Search Model Downloaded" : "Download the Search Model"}
            subtitle={
              modelDownloaded
                ? "Searching by meaning works offline"
                : "A one-time 90 MB download for searching by meaning"
            }
            actions={
              <ActionPanel>
                {!modelDownloaded && (
                  <Action
                    title="Download Now"
                    icon={Icon.Download}
                    onAction={() =>
                      run("Downloading Search Model…", ensureSearchModel, "Search Model Downloaded", {
                        message: "About 90 MB, one time only",
                      })
                    }
                  />
                )}
                {common}
              </ActionPanel>
            }
          />
        )}

        {cli && signedIn && SEARCHES_BY_MEANING && modelDownloaded && (
          <SearchIndexItem
            rebuild={rebuild}
            onRebuild={async () => {
              try {
                await startRebuild();
                log.info("search index rebuild started");
                await showRebuildProgress(refreshLocal().rebuild);
              } catch (error) {
                await failToast(error, "Couldn't Rebuild Search Index");
              }
            }}
            actions={common}
            whileRunning={reportAction}
          />
        )}

        {cli && signedIn && data.schedule && (
          <List.Item
            icon={data.schedule.enabled ? ok : off}
            title={data.schedule.enabled ? "Background Sync On" : "Background Sync Off"}
            subtitle={
              data.schedule.enabled
                ? `Every ${plural(data.schedule.interval_minutes ?? 30, "minute")}, even when Raycast is closed`
                : "Optional: sync on a schedule without opening Raycast"
            }
            actions={
              <ActionPanel>
                <Action
                  title={data.schedule.enabled ? "Turn off Background Sync" : "Turn on Background Sync"}
                  icon={data.schedule.enabled ? Icon.Stop : Icon.Play}
                  onAction={() =>
                    run(
                      data.schedule?.enabled ? "Turning Off Background Sync…" : "Turning On Background Sync…",
                      () => setSchedule(!data.schedule?.enabled),
                      data.schedule?.enabled ? "Background Sync Off" : "Background Sync On",
                    )
                  }
                />
                {common}
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      {cli && data.telemetry && (
        <List.Section title="Privacy">
          <List.Item
            icon={data.telemetry.permitted ? { source: Icon.Signal3, tintColor: Color.Blue } : off}
            title={data.telemetry.permitted ? "CLI Telemetry On" : "CLI Telemetry Off"}
            subtitle={
              data.telemetry.disabled_by_environment
                ? "Turned off by DO_NOT_TRACK or DAYONE_TELEMETRY"
                : "Usage analytics the CLI sends to Automattic; never journal text"
            }
            actions={
              <ActionPanel>
                {!data.telemetry.disabled_by_environment && (
                  <Action
                    title={data.telemetry.permitted ? "Turn off Telemetry" : "Turn on Telemetry"}
                    icon={data.telemetry.permitted ? Icon.Stop : Icon.Play}
                    onAction={async () => {
                      const enable = !data.telemetry?.permitted;
                      if (enable) {
                        const confirmed = await confirmAlert({
                          title: "Turn On CLI Telemetry?",
                          message:
                            "The CLI sends Automattic a random installation ID, command categories, outcomes, device details, plan, and approximate location from your IP address. It never sends journal content.",
                          primaryAction: { title: "Turn On" },
                        });
                        if (!confirmed) return;
                      }
                      await run(
                        enable ? "Turning On Telemetry…" : "Turning Off Telemetry…",
                        () => setTelemetry(enable),
                        enable ? "CLI Telemetry On" : "CLI Telemetry Off",
                      );
                    }}
                  />
                )}
                <Action.OpenInBrowser
                  title="Read the Telemetry Policy"
                  url="https://github.com/Automattic/DayOne-Cli/blob/main/docs/telemetry.md"
                />
                {common}
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="AI Agents">
        <List.Item
          icon={skillsInstalled ? ok : Icon.Stars}
          title={skillsInstalled ? "Day One Agent Skills Installed" : "Install Day One Agent Skills"}
          subtitle={
            skillsInstalled
              ? "Ask Claude Code, Codex, or Cursor about your journal"
              : "Teaches Claude Code, Codex, and other agents to use the CLI"
          }
          actions={
            <ActionPanel>
              {skillsInstalled ? (
                <Action.Push title="See How to Use Them" icon={Icon.Book} target={<AgentSkillsHelp />} />
              ) : (
                <Action
                  title="Install for Me"
                  icon={Icon.Download}
                  onAction={() =>
                    run("Installing Agent Skills…", installAgentSkills, "Agent Skills Installed", {
                      then: { title: "See How to Use Them", onAction: () => push(<AgentSkillsHelp />) },
                    })
                  }
                />
              )}
              {skillsInstalled ? (
                <Action
                  title="Update Agent Skills"
                  icon={Icon.Download}
                  onAction={() => run("Updating Agent Skills…", installAgentSkills, "Agent Skills Updated")}
                />
              ) : (
                <Action.Push title="See How to Use Them" icon={Icon.Book} target={<AgentSkillsHelp />} />
              )}
              <Action.CopyToClipboard title="Copy Install Command" content={SKILLS_COMMAND} />
              <Action.OpenInBrowser title="Open Skills Repository" url={SKILLS_REPO_URL} />
              {common}
            </ActionPanel>
          }
        />
        {data.mcp.map((finding) => (
          <List.Item
            key={finding.file}
            icon={warn}
            title={`Update ${basename(finding.file)}`}
            subtitle={`${finding.servers.join(", ")} still runs dayone mcp; change the command to dayone-mac`}
            actions={
              <ActionPanel>
                <Action.ShowInFinder path={finding.file} />
                <Action.CopyToClipboard
                  title="Copy Config Path"
                  content={finding.file}
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                />
                <Action.CopyToClipboard title="Copy New Command" content={RENAMED_LEGACY_CLI_PATH} />
                {common}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {report && (
        <List.Section title="CLI Checks" subtitle={report.status}>
          {report.checks.map((check) => (
            <List.Item
              key={check.check}
              icon={CHECK_ICONS[check.status] ?? warn}
              title={check.check.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
              subtitle={check.summary}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Summary" content={check.summary} />
                  {common}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {data.problems.length > 0 && (
        <List.Section title="Problems">
          {data.problems.map((problem) => (
            <List.Item
              key={problem}
              icon={bad}
              title={problem.split("\n")[0]}
              actions={
                <ActionPanel>
                  <Action title="Copy Error" icon={Icon.Clipboard} onAction={() => Clipboard.copy(problem)} />
                  {common}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function SearchIndexItem(props: {
  rebuild: RebuildStatus;
  onRebuild: () => void;
  actions: ReactNode;
  whileRunning: ReactNode;
}) {
  const { rebuild } = props;
  const rebuildAction = (
    <Action
      title={rebuild.state === "failed" ? "Rebuild Again" : "Rebuild Search Index"}
      icon={Icon.Hammer}
      onAction={props.onRebuild}
    />
  );
  if (rebuild.state === "running") {
    return (
      <List.Item
        icon={{ source: Icon.CircleProgress, tintColor: Color.Blue }}
        title="Rebuilding the Search Index"
        subtitle={`${rebuildProgressText(rebuild.progress)} · it keeps going if you close Raycast`}
        // No Check Again while it runs: it would only reload the same row.
        actions={<ActionPanel>{props.whileRunning}</ActionPanel>}
      />
    );
  }
  if (rebuild.state === "failed") {
    return (
      <List.Item
        icon={bad}
        title="Search Index Rebuild Failed"
        subtitle={errorMessage(rebuild.error).split("\n")[0]}
        actions={
          <ActionPanel>
            {rebuildAction}
            <Action.CopyToClipboard title="Copy Error" content={errorMessage(rebuild.error)} />
            {props.actions}
          </ActionPanel>
        }
      />
    );
  }
  const recent = rebuild.state === "done" && Date.now() - rebuild.finishedAt < 24 * 60 * 60 * 1000;
  return (
    <List.Item
      icon={ok}
      title="Search Index"
      subtitle={
        recent
          ? `Rebuilt ${ago((Date.now() - rebuild.finishedAt) / 1000)} · ${plural(rebuild.recalculated, "entry", "entries")}`
          : "Rebuild it if a search misses an entry you know is there"
      }
      actions={
        <ActionPanel>
          {rebuildAction}
          {props.actions}
        </ActionPanel>
      }
    />
  );
}

function rebuildProgressText(progress: RebuildProgress): string {
  if (progress.journalsDone === 0) return "Starting…";
  const entries = progress.entries
    ? `${progress.entriesDone.toLocaleString()} of ${plural(progress.entries, "entry", "entries")}`
    : plural(progress.entriesDone, "entry", "entries");
  return `${entries} · ${progress.journalsDone} of ${plural(progress.journals, "journal")}`;
}
