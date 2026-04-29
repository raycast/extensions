import {
  MenuBarExtra,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Color,
  open,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AbsenceResponse, HakunaTimer } from "./hakuna-api";

interface Preferences {
  apiToken: string;
}

function absenceMenuIcon(absence: AbsenceResponse) {
  if (absence.absence_type.is_vacation) return Icon.AirplaneTakeoff;
  if (absence.absence_type.grants_work_time) return Icon.PauseFilled;
  return Icon.Leaf;
}

function isTodayInAbsence(absence: AbsenceResponse, today: string): boolean {
  return absence.start_date <= today && today <= absence.end_date;
}

export default function Command() {
  const { apiToken } = getPreferenceValues<Preferences>();
  const timer = new HakunaTimer(apiToken);

  const {
    data: overview,
    isLoading: isLoadingOverview,
    mutate: mutateOverview,
  } = useCachedPromise(async () => {
    return await timer.getOverview();
  });

  const {
    data: worktime,
    isLoading: isLoadingWorktime,
    mutate: mutateWorktime,
  } = useCachedPromise(async () => {
    return await timer.getWorktime();
  });

  const {
    data: activeTimer,
    isLoading: isLoadingTimer,
    mutate: mutateTimer,
  } = useCachedPromise(async () => {
    return await timer.getTimer();
  });

  const {
    data: timeEntries,
    isLoading: isLoadingEntries,
    mutate: mutateEntries,
  } = useCachedPromise(async () => {
    const today = new Date().toISOString().split("T")[0];
    return await timer.getTimeEntries(today);
  });

  const { data: absences, isLoading: isLoadingAbsences } = useCachedPromise(
    async () => {
      const year = new Date().getFullYear();
      return await timer.getAbsences(year);
    },
  );

  const isLoading =
    isLoadingOverview ||
    isLoadingWorktime ||
    isLoadingTimer ||
    isLoadingEntries ||
    isLoadingAbsences;

  const refreshAll = () => {
    mutateOverview();
    mutateWorktime();
    mutateTimer();
    mutateEntries();
  };

  const handleStopTimer = async () => {
    try {
      const stopped = await timer.stopTimer();
      await showToast({
        style: Toast.Style.Success,
        title: "Timer Stopped",
        message: `Stopped at ${stopped.end_time}`,
      });
      refreshAll();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop timer",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleCancelTimer = async () => {
    if (
      await confirmAlert({
        title: "Cancel Timer",
        message:
          "Are you sure you want to cancel the current timer? This cannot be undone.",
        primaryAction: {
          title: "Cancel Timer",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await timer.deleteTimer();
        await showToast({
          style: Toast.Style.Success,
          title: "Timer Cancelled",
        });
        refreshAll();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to cancel timer",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const todaysAbsences = (absences ?? []).filter((a) =>
    isTodayInAbsence(a, today),
  );

  return (
    <MenuBarExtra
      icon={
        activeTimer ? { source: Icon.Clock, tintColor: Color.Blue } : Icon.Clock
      }
      title={worktime || "00:00"}
      isLoading={isLoading}
      tooltip="Hakuna Overview"
    >
      <MenuBarExtra.Section title="Time">
        {activeTimer ? (
          <>
            <MenuBarExtra.Item
              title="Stop Timer"
              subtitle={
                activeTimer.start_time
                  ? `Started at ${activeTimer.start_time}`
                  : undefined
              }
              icon={Icon.Stop}
              onAction={handleStopTimer}
            />
            <MenuBarExtra.Item
              title="Edit Timer"
              icon={Icon.Pencil}
              onAction={async () => {
                await launchCommand({
                  name: "timer",
                  type: LaunchType.UserInitiated,
                });
              }}
            />
            <MenuBarExtra.Item
              title="Cancel Timer"
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              onAction={handleCancelTimer}
            />
          </>
        ) : (
          <MenuBarExtra.Item
            title="Start Timer"
            icon={Icon.Play}
            onAction={async () => {
              await launchCommand({
                name: "timer",
                type: LaunchType.UserInitiated,
              });
            }}
          />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Time Entries">
        <MenuBarExtra.Item
          title="Add Time Entry"
          icon={Icon.Plus}
          onAction={async () => {
            await launchCommand({
              name: "add-time-entry",
              type: LaunchType.UserInitiated,
            });
          }}
        />
        <MenuBarExtra.Item
          title="View Today's Entries"
          icon={Icon.List}
          onAction={async () => {
            await launchCommand({
              name: "time-entries",
              type: LaunchType.UserInitiated,
            });
          }}
        />
      </MenuBarExtra.Section>

      {todaysAbsences.length > 0 && (
        <MenuBarExtra.Section title="Today's Absences">
          {todaysAbsences.map((absence) => (
            <MenuBarExtra.Item
              key={absence.id}
              title={absence.absence_type.name}
              icon={absenceMenuIcon(absence)}
              onAction={async () => {
                await launchCommand({
                  name: "absences",
                  type: LaunchType.UserInitiated,
                });
              }}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {(timeEntries ?? []).length > 0 && (
        <MenuBarExtra.Section title="Recent Entries">
          {(timeEntries ?? [])
            .slice(-3)
            .reverse()
            .map((entry) => (
              <MenuBarExtra.Item
                key={entry.id}
                title={entry.task?.name ?? "Entry"}
                subtitle={`${entry.start_time}–${entry.end_time ?? "…"} (${entry.duration})`}
                onAction={async () => {
                  await launchCommand({
                    name: "add-time-entry",
                    type: LaunchType.UserInitiated,
                    context: { entry },
                  });
                }}
              />
            ))}
          {(timeEntries ?? []).length > 3 && (
            <MenuBarExtra.Submenu title="More Entries" icon={Icon.ChevronDown}>
              {(timeEntries ?? [])
                .slice(0, -3)
                .reverse()
                .map((entry) => (
                  <MenuBarExtra.Item
                    key={entry.id}
                    title={entry.task?.name ?? "Entry"}
                    subtitle={`${entry.start_time}–${entry.end_time ?? "…"} (${entry.duration})`}
                    onAction={async () => {
                      await launchCommand({
                        name: "add-time-entry",
                        type: LaunchType.UserInitiated,
                        context: { entry },
                      });
                    }}
                  />
                ))}
            </MenuBarExtra.Submenu>
          )}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section title="Profile">
        <MenuBarExtra.Item
          title="Overtime"
          subtitle={overview?.overtime || "00:00"}
          icon={Icon.Paragraph}
          onAction={async () => {
            await launchCommand({
              name: "profile",
              type: LaunchType.UserInitiated,
            });
          }}
        />
        <MenuBarExtra.Item
          title="Vacation Remaining"
          subtitle={
            overview ? `${overview.vacation.remaining_days} days` : "0 days"
          }
          icon={Icon.Calendar}
          onAction={async () => {
            await launchCommand({
              name: "profile",
              type: LaunchType.UserInitiated,
            });
          }}
        />
        <MenuBarExtra.Item
          title="Vacation Redeemed"
          subtitle={
            overview ? `${overview.vacation.redeemed_days} days` : "0 days"
          }
          icon={Icon.Checkmark}
          onAction={async () => {
            await launchCommand({
              name: "profile",
              type: LaunchType.UserInitiated,
            });
          }}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Website">
        <MenuBarExtra.Item
          title="Open Hakuna"
          icon={Icon.Globe}
          onAction={async () => {
            await open("https://app.hakuna.ch");
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
