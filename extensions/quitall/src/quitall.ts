import {
  Alert,
  confirmAlert,
  getPreferenceValues,
  Icon,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import {
  createQuitPlan,
  getAppRule,
  isProtectedBundleId,
  keepStillRunning,
  loadAppRules,
} from "./lib/app-rules";
import { loadCustomProcessRules } from "./lib/custom-process-rules";
import {
  listRunningApplications,
  listRunningDockApplications,
  requestForceQuit,
  requestNormalQuit,
} from "./lib/macos-applications";
import {
  keepProcessesStillRunning,
  listRunningProcesses,
  matchCustomRulesToRunningTargets,
  requestProcessTermination,
} from "./lib/running-processes";
import type { RunningApplication, RunningProcess } from "./types";

interface Preferences {
  quitTimeoutSeconds: string;
}

interface NamedTarget {
  name: string;
}

const FORCE_SETTLE_TIME_MS = 500;

export default async function Command(): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Running QuitAll…",
  });

  try {
    const [
      runningDockApplications,
      allRunningApplications,
      runningProcesses,
      appRules,
      customProcessRules,
    ] = await Promise.all([
      listRunningDockApplications(),
      listRunningApplications(),
      listRunningProcesses(),
      loadAppRules(),
      loadCustomProcessRules(),
    ]);

    const dockPlan = createQuitPlan(runningDockApplications, appRules);
    const customMatches = matchCustomRulesToRunningTargets(
      customProcessRules,
      allRunningApplications,
      runningProcesses,
    );
    const skippedCustomApplications = customMatches.applications
      .map((match) => match.application)
      .filter(
        (application) =>
          isProtectedBundleId(application.bundleId) ||
          getAppRule(appRules, application.bundleId) === "whitelist",
      );
    const customApplicationsToQuit = customMatches.applications.filter(
      ({ application }) =>
        !isProtectedBundleId(application.bundleId) &&
        getAppRule(appRules, application.bundleId) !== "whitelist",
    );

    const applicationsToQuit = uniqueApplications([
      ...dockPlan.requestNormalQuit,
      ...customApplicationsToQuit.map((match) => match.application),
    ]);
    const processesToQuit = uniqueProcesses(customMatches.processes.map((match) => match.process));
    const automaticApplicationKeys = new Set([
      ...dockPlan.forceAfterTimeout.map(applicationIdentity),
      ...customApplicationsToQuit
        .filter((match) => match.forceAfterTimeout)
        .map((match) => applicationIdentity(match.application)),
    ]);
    const automaticProcessKeys = new Set(
      customMatches.processes
        .filter((match) => match.forceAfterTimeout)
        .map((match) => processIdentity(match.process)),
    );
    const skippedCount = uniqueApplications([
      ...dockPlan.whitelisted,
      ...skippedCustomApplications,
    ]).length;

    if (applicationsToQuit.length === 0 && processesToQuit.length === 0) {
      await toast.hide();
      await showHUD(
        skippedCount > 0 ? `Nothing to quit · ${skippedCount} whitelisted` : "Nothing to quit",
      );
      return;
    }

    await Promise.all([
      requestNormalQuit(applicationsToQuit),
      requestProcessTermination(processesToQuit, false),
    ]);

    const timeoutMs = getQuitTimeoutMilliseconds();
    toast.message = `Waiting up to ${timeoutMs / 1000}s before Force Quit checks`;
    await delay(timeoutMs);

    const [applicationsAfterNormalQuit, processesAfterNormalQuit] = await Promise.all([
      listRunningApplications(),
      listRunningProcesses(),
    ]);
    const stillRunningApplications = keepStillRunning(
      applicationsToQuit,
      applicationsAfterNormalQuit,
    );
    const stillRunningProcesses = keepProcessesStillRunning(
      processesToQuit,
      processesAfterNormalQuit,
    );
    const automaticForceQuitApplications = stillRunningApplications.filter((application) =>
      automaticApplicationKeys.has(applicationIdentity(application)),
    );
    const automaticForceQuitProcesses = stillRunningProcesses.filter((runningProcess) =>
      automaticProcessKeys.has(processIdentity(runningProcess)),
    );

    if (automaticForceQuitApplications.length > 0 || automaticForceQuitProcesses.length > 0) {
      const automaticCount =
        automaticForceQuitApplications.length + automaticForceQuitProcesses.length;
      toast.message = `Force quitting ${formatCount(automaticCount, "target")} by rule`;
      await Promise.all([
        requestForceQuit(automaticForceQuitApplications),
        requestProcessTermination(automaticForceQuitProcesses, true),
      ]);
      await delay(FORCE_SETTLE_TIME_MS);
    }

    const [applicationsAfterAutomaticForceQuit, processesAfterAutomaticForceQuit] =
      automaticForceQuitApplications.length > 0 || automaticForceQuitProcesses.length > 0
        ? await Promise.all([listRunningApplications(), listRunningProcesses()])
        : [applicationsAfterNormalQuit, processesAfterNormalQuit];
    const defaultApplications = keepStillRunning(
      stillRunningApplications.filter(
        (application) => !automaticApplicationKeys.has(applicationIdentity(application)),
      ),
      applicationsAfterAutomaticForceQuit,
    );
    const defaultProcesses = keepProcessesStillRunning(
      stillRunningProcesses.filter(
        (runningProcess) => !automaticProcessKeys.has(processIdentity(runningProcess)),
      ),
      processesAfterAutomaticForceQuit,
    );

    let userForceQuitApplications: RunningApplication[] = [];
    let userForceQuitProcesses: RunningProcess[] = [];

    if (defaultApplications.length > 0 || defaultProcesses.length > 0) {
      await toast.hide();

      const confirmed = await confirmForceQuit([...defaultApplications, ...defaultProcesses]);

      if (confirmed) {
        await Promise.all([
          requestForceQuit(defaultApplications),
          requestProcessTermination(defaultProcesses, true),
        ]);
        userForceQuitApplications = defaultApplications;
        userForceQuitProcesses = defaultProcesses;
        await delay(FORCE_SETTLE_TIME_MS);
      }
    }

    const [finalRunningApplications, finalRunningProcesses] = await Promise.all([
      listRunningApplications(),
      listRunningProcesses(),
    ]);
    const finalApplications = keepStillRunning(applicationsToQuit, finalRunningApplications);
    const finalProcesses = keepProcessesStillRunning(processesToQuit, finalRunningProcesses);
    const closedCount =
      applicationsToQuit.length +
      processesToQuit.length -
      finalApplications.length -
      finalProcesses.length;
    const automaticForcedCount =
      automaticForceQuitApplications.length +
      automaticForceQuitProcesses.length -
      keepStillRunning(automaticForceQuitApplications, finalRunningApplications).length -
      keepProcessesStillRunning(automaticForceQuitProcesses, finalRunningProcesses).length;
    const userForcedCount =
      userForceQuitApplications.length +
      userForceQuitProcesses.length -
      keepStillRunning(userForceQuitApplications, finalRunningApplications).length -
      keepProcessesStillRunning(userForceQuitProcesses, finalRunningProcesses).length;

    await toast.hide();
    await showHUD(
      createSummary({
        automaticForcedCount,
        closedCount,
        remainingCount: finalApplications.length + finalProcesses.length,
        skippedCount,
        userForcedCount,
      }),
    );
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "QuitAll failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

async function confirmForceQuit(targets: NamedTarget[]): Promise<boolean> {
  const visibleNames = targets.slice(0, 6).map((target) => target.name);
  const hiddenCount = targets.length - visibleNames.length;
  const names =
    hiddenCount > 0
      ? `${visibleNames.join(", ")} and ${hiddenCount} more`
      : visibleNames.join(", ");

  return confirmAlert({
    icon: Icon.ExclamationMark,
    title: `Force quit ${formatCount(targets.length, "target")}?`,
    message: `${names} did not quit in time. Unsaved changes may be lost.`,
    primaryAction: {
      title: "Force Quit",
      style: Alert.ActionStyle.Destructive,
    },
    dismissAction: {
      title: "Leave Open",
    },
  });
}

function getQuitTimeoutMilliseconds(): number {
  const { quitTimeoutSeconds } = getPreferenceValues<Preferences>();
  const seconds = Number(quitTimeoutSeconds);
  return (Number.isFinite(seconds) && seconds >= 1 ? seconds : 3) * 1000;
}

function createSummary(counts: {
  automaticForcedCount: number;
  closedCount: number;
  remainingCount: number;
  skippedCount: number;
  userForcedCount: number;
}): string {
  const parts = [`Quit ${counts.closedCount}`];
  const forcedCount = counts.automaticForcedCount + counts.userForcedCount;

  if (forcedCount > 0) {
    parts.push(`force quit ${forcedCount}`);
  }

  if (counts.skippedCount > 0) {
    parts.push(`whitelisted ${counts.skippedCount}`);
  }

  if (counts.remainingCount > 0) {
    parts.push(`left open ${counts.remainingCount}`);
  }

  return parts.join(" · ");
}

function uniqueApplications(applications: RunningApplication[]): RunningApplication[] {
  return [
    ...new Map(
      applications.map((application) => [applicationIdentity(application), application]),
    ).values(),
  ];
}

function uniqueProcesses(processes: RunningProcess[]): RunningProcess[] {
  return [
    ...new Map(
      processes.map((runningProcess) => [processIdentity(runningProcess), runningProcess]),
    ).values(),
  ];
}

function applicationIdentity(application: RunningApplication): string {
  return `${application.pid}:${application.bundleId}`;
}

function processIdentity(runningProcess: RunningProcess): string {
  return `${runningProcess.pid}:${runningProcess.executablePath}`;
}

function formatCount(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
