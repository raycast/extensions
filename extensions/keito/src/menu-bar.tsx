import {
  Color,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  showHUD,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import dayjs from "dayjs";
import { useEffect } from "react";
import { openKeito } from "./services/keitoApp";
import { errorMessage, errorTitle, isKeitoError } from "./services/keito/errors";
import { syncStatusFile } from "./services/keito/statusFile";
import { TimeEntry } from "./services/keito/types";
import { describeEntry, formatHours, getApi, getSession, showKeitoError, todayString } from "./services/useKeito";
import { primaryShortcut } from "./shortcuts";

interface Snapshot {
  running: TimeEntry | null;
  todayHours: number;
}

// `scope` is part of the arguments so cached snapshots are kept per company and identity.
async function loadSnapshot(scope: string, userId: string, today: string): Promise<Snapshot> {
  if (!scope) return { running: null, todayHours: 0 };
  const api = getApi();
  const [running, todays] = await Promise.all([
    api.listRunningEntries(userId),
    api.listTimeEntries({ userId, from: today, to: today }),
  ]);
  return { running: running[0] ?? null, todayHours: todays.reduce((sum, e) => sum + e.hours, 0) };
}

function launch(name: string) {
  return launchCommand({ name, type: LaunchType.UserInitiated });
}

export default function MenuBar() {
  const { showTimerInMenuBar = true, statusFolder } = getPreferenceValues<Preferences.MenuBar>();
  const {
    data: session,
    error: sessionError,
    isLoading: sessionLoading,
    revalidate: revalidateSession,
  } = usePromise(() => getSession(), [], {
    onError: () => undefined,
  });
  const today = todayString(session);
  const { data, isLoading, error, revalidate } = useCachedPromise(
    loadSnapshot,
    [session?.scope ?? "", session?.identity.userId ?? "", today],
    { execute: !!session, keepPreviousData: true, onError: () => undefined },
  );

  const running = data?.running ?? null;

  useEffect(() => {
    if (!session || isLoading || error) return;
    try {
      syncStatusFile(statusFolder, running, session.identity.companyId);
    } catch (fileError) {
      console.error("Could not update the status file", fileError instanceof Error ? fileError.message : fileError);
    }
  }, [running?.id, running?.hours, running?.notes, session?.scope, isLoading, error]);

  const problem = sessionError ?? error;
  if (problem) {
    return (
      <MenuBarExtra
        icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
        isLoading={sessionLoading || isLoading}
        tooltip="Keito"
      >
        <MenuBarExtra.Item title={errorTitle(problem)} subtitle={errorMessage(problem).slice(0, 80)} />
        <MenuBarExtra.Item
          title={
            isKeitoError(problem) && problem.kind === "signed_out" ? "Sign In to Keito…" : "Open Keito Connection…"
          }
          icon={Icon.Key}
          onAction={() => launch("connection")}
        />
        <MenuBarExtra.Item
          title="Retry"
          icon={Icon.ArrowClockwise}
          onAction={() => (sessionError ? revalidateSession() : revalidate())}
        />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra
      icon={running ? { source: Icon.Clock, tintColor: Color.Orange } : Icon.Clock}
      title={running && showTimerInMenuBar ? formatHours(running.hours) : undefined}
      tooltip={running ? `Keito: ${describeEntry(running)}` : "Keito: no timer running"}
      isLoading={sessionLoading || isLoading}
    >
      {running ? (
        <MenuBarExtra.Section title="Running Timer">
          <MenuBarExtra.Item title={describeEntry(running)} subtitle={running.clientName} />
          {running.notes && <MenuBarExtra.Item title={running.notes.slice(0, 80)} />}
          <MenuBarExtra.Item
            title={`${formatHours(running.hours)}${
              running.timerStartedAt ? ` since ${dayjs(running.timerStartedAt).format("HH:mm")}` : ""
            }`}
            icon={Icon.Clock}
          />
          <MenuBarExtra.Item
            title="Stop Timer"
            icon={Icon.Stop}
            shortcut={primaryShortcut("s")}
            onAction={async () => {
              try {
                await getApi().stopTimeEntry(running.id);
                await showHUD(`Timer stopped: ${describeEntry(running)}`);
                revalidate();
              } catch (stopError) {
                await showKeitoError(stopError, "Could not stop the timer");
              }
            }}
          />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="No Timer Running" />
          <MenuBarExtra.Item title="Restart Last Timer" icon={Icon.Play} onAction={() => launch("toggleTimer")} />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={`Today: ${formatHours(data?.todayHours ?? 0)}`} />
        <MenuBarExtra.Item title="View Timesheet" icon={Icon.List} onAction={() => launch("listTimeEntries")} />
        <MenuBarExtra.Item title="New Time Entry" icon={Icon.Plus} onAction={() => launch("new")} />
        <MenuBarExtra.Item title="Favorites" icon={Icon.Star} onAction={() => launch("listFavorites")} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => revalidate()}
        />
        <MenuBarExtra.Item title="Open Keito" icon={Icon.Globe} onAction={openKeito} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
