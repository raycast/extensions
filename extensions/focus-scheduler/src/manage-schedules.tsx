import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  Icon,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ScheduleForm } from "./components/ScheduleForm";
import { categoryTitle } from "./lib/categories";
import { startFocusSession } from "./lib/focus";
import {
  describeSchedule,
  isWithinWindow,
  remainingDurationSeconds,
  windowDurationSeconds,
} from "./lib/schedule";
import {
  clearScheduleStartMarker,
  deleteSchedule,
  loadCustomCategories,
  loadSchedules,
  upsertSchedule,
} from "./lib/storage";
import { FocusSchedule } from "./lib/types";

function EditSchedule({ schedule }: { schedule: FocusSchedule }) {
  return <ScheduleForm schedule={schedule} />;
}

export default function ManageSchedulesCommand() {
  const { push } = useNavigation();
  const {
    data: schedules = [],
    isLoading,
    revalidate,
  } = useCachedPromise(loadSchedules);

  async function toggleEnabled(schedule: FocusSchedule) {
    const enabled = !schedule.enabled;
    await upsertSchedule({
      ...schedule,
      enabled,
      updatedAt: new Date().toISOString(),
    });

    if (enabled) {
      await clearScheduleStartMarker(schedule.id);
    }

    // Start (on enable) or stop (on disable) Focus immediately.
    try {
      await launchCommand({
        name: "check-schedules",
        type: LaunchType.UserInitiated,
      });
    } catch (error) {
      console.error("Focus Scheduler: could not launch check-schedules", error);
    }

    await showToast({
      style: Toast.Style.Success,
      title: enabled ? "Schedule enabled" : "Schedule disabled",
      message: schedule.name,
    });
    revalidate();
  }

  async function remove(schedule: FocusSchedule) {
    const confirmed = await confirmAlert({
      title: "Delete schedule?",
      message: `Remove “${schedule.name}”? This cannot be undone.`,
      primaryAction: { title: "Delete" },
    });
    if (!confirmed) return;

    await deleteSchedule(schedule.id);
    await showToast({
      style: Toast.Style.Success,
      title: "Schedule deleted",
      message: schedule.name,
    });
    revalidate();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Focus schedules…">
      <List.EmptyView
        icon={Icon.Clock}
        title="No Focus schedules"
        description="Create a schedule with days, times, and Focus categories."
        actions={
          <ActionPanel>
            <Action
              title="Create Schedule"
              icon={Icon.Plus}
              onAction={() => push(<ScheduleForm />)}
            />
          </ActionPanel>
        }
      />

      {schedules.map((schedule) => {
        const now = new Date();
        const inWindow = isWithinWindow(
          schedule.startTime,
          schedule.endTime,
          now,
        );
        const remainingMin = inWindow
          ? Math.round(
              remainingDurationSeconds(
                schedule.startTime,
                schedule.endTime,
                now,
              ) / 60,
            )
          : null;
        const windowMin = Math.round(
          windowDurationSeconds(schedule.startTime, schedule.endTime) / 60,
        );
        const categoryLabels = schedule.categories.map((id) =>
          categoryTitle(id),
        );
        const categoriesText =
          categoryLabels.length > 0
            ? categoryLabels.join(", ")
            : "No categories";

        return (
          <List.Item
            key={schedule.id}
            title={schedule.name}
            subtitle={`${describeSchedule(schedule)} · ${categoriesText}`}
            keywords={[...schedule.categories, ...categoryLabels]}
            icon={{
              source: schedule.enabled ? Icon.Clock : Icon.MinusCircle,
              tintColor: schedule.enabled ? Color.Orange : Color.SecondaryText,
            }}
            accessories={[
              ...categoryLabels.map((label) => ({
                tag: { value: label, color: Color.Blue },
              })),
              {
                tag: {
                  value: schedule.mode === "block" ? "Block" : "Allow",
                  color: Color.SecondaryText,
                },
              },
              {
                text:
                  remainingMin !== null
                    ? `${remainingMin}m left`
                    : `${windowMin}m window`,
              },
              ...(schedule.enabled
                ? []
                : [{ tag: { value: "Off", color: Color.Red } }]),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Schedule"
                  icon={Icon.Pencil}
                  onAction={() => push(<EditSchedule schedule={schedule} />)}
                />
                <Action
                  title={schedule.enabled ? "Disable" : "Enable"}
                  icon={schedule.enabled ? Icon.Pause : Icon.Play}
                  onAction={() => toggleEnabled(schedule)}
                />
                <Action
                  title="Start Focus Now"
                  icon={Icon.BullsEye}
                  onAction={async () => {
                    const known = await loadCustomCategories();
                    const durationSeconds = remainingDurationSeconds(
                      schedule.startTime,
                      schedule.endTime,
                    );
                    if (durationSeconds < 60) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Outside schedule window",
                        message: `Nothing left until ${schedule.endTime}`,
                      });
                      return;
                    }
                    await startFocusSession({
                      goal: schedule.goal,
                      categories: schedule.categories,
                      durationSeconds,
                      mode: schedule.mode,
                      knownCategories: known,
                    });
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Focus started",
                      message: `${Math.round(durationSeconds / 60)}m remaining until ${schedule.endTime}`,
                    });
                  }}
                />
                <Action
                  title="Run Schedule Check"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={async () => {
                    await clearScheduleStartMarker(schedule.id);
                    await launchCommand({
                      name: "check-schedules",
                      type: LaunchType.UserInitiated,
                    });
                    revalidate();
                  }}
                />
                <Action
                  title="Create Schedule"
                  icon={Icon.Plus}
                  onAction={() => push(<ScheduleForm />)}
                />
                <Action
                  title="Delete Schedule"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => remove(schedule)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
