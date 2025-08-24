import { getPreferenceValues, Icon, open, showHUD } from "@raycast/api";
import { format, isWithinInterval } from "date-fns";
import { Event } from "../types/event";
import { NativePreferences } from "../types/preferences";
import { SmartHabit } from "../types/smart-series";
import { formatDisplayEventHours, formatDisplayHours } from "../utils/dates";
import { filterMultipleOutDuplicateEvents } from "../utils/events";
import { fetchPromise } from "../utils/fetcher";
import { upgradeAndCaptureError } from "../utils/sentry";
import { stripPlannerEmojis } from "../utils/string";
import useApi, { UseApiError } from "./useApi";
import { useCallbackSafeRef } from "./useCallbackSafeRef";
import { ApiResponseEvents, EventActions } from "./useEvent.types";
import { useSmartHabits } from "./useSmartHabits";
import { useTaskActions } from "./useTask";
import { useUser } from "./useUser";

export class UseEventsError extends UseApiError {}

export const useEvents = ({ start, end }: { readonly start: Date; readonly end: Date }) => {
  try {
    const {
      data: events,
      error,
      isLoading,
    } = useApi<ApiResponseEvents>(
      `/events?${new URLSearchParams({
        sourceDetails: "true",
        start: format(start, "yyyy-MM-dd"),
        end: format(end, "yyyy-MM-dd"),
        allConnected: "true",
      }).toString()}`
    );

    return {
      events: filterMultipleOutDuplicateEvents(events),
      isLoading,
      error,
    };
  } catch (error) {
    throw upgradeAndCaptureError(
      error,
      UseEventsError,
      (cause) => new UseEventsError("Something went wrong", { cause })
    );
  }
};

export const useEventActions = () => {
  const { currentUser } = useUser();
  const { startTask, restartTask, stopTask } = useTaskActions();
  const { apiUrl } = getPreferenceValues<NativePreferences>();

  const { smartHabitsByLineageIdsMap } = useSmartHabits();

  const showFormattedEventTitle = useCallbackSafeRef((event: Event, mini = false) => {
    const meridianFormat = currentUser?.settings.format24HourTime ? "24h" : "12h";

    const hours = mini
      ? formatDisplayHours(new Date(event.eventStart), meridianFormat)
      : formatDisplayEventHours({
          start: new Date(event.eventStart),
          end: new Date(event.eventEnd),
          hoursFormat: meridianFormat,
        });

    const realEventTitle = event.sourceDetails?.title || event.title;
    return `${hours}  ${stripPlannerEmojis(realEventTitle)}`;
  });

  const handleStartHabit = async (id: string, title: string) => {
    try {
      await showHUD("Started Habit: " + stripPlannerEmojis(title));
      const [habit, error] = await fetchPromise(`/planner/start/habit/${id}`, { init: { method: "POST" } });
      if (!habit || error) throw error;
      return habit;
    } catch (error) {
      console.error("Error while starting habit", error);
      await showHUD("Whoops, something went wrong! Contact support.");
    }
  };

  const handleRestartHabit = async (id: string, title: string) => {
    try {
      await showHUD("Restarted Habit: " + stripPlannerEmojis(title));
      const [habit, error] = await fetchPromise(`/planner/restart/habit/${id}`, { init: { method: "POST" } });
      if (!habit || error) throw error;
      return habit;
    } catch (error) {
      console.error("Error while restarting habit", error);
      await showHUD("Whoops, something went wrong! Contact support.");
    }
  };

  const handleStopHabit = async (id: string, title: string) => {
    try {
      await showHUD("Stopped Habit: " + stripPlannerEmojis(title));
      const [habit, error] = await fetchPromise(`/planner/stop/habit/${id}`, { init: { method: "POST" } });
      if (!habit || error) throw error;

      return habit;
    } catch (error) {
      console.error("Error while stopping habit", error);
      await showHUD("Whoops, something went wrong! Contact support.");
    }
  };

  const handleStartOrRestartSmartHabit = async (lineageId: string, title: string) => {
    try {
      await showHUD("Started Habit: " + stripPlannerEmojis(title));
      const [habit, error] = await fetchPromise(`/smart-habits/planner/${lineageId}/start`, {
        init: { method: "POST" },
      });
      if (!habit || error) throw error;

      return habit;
    } catch (error) {
      console.error("Error while starting habit", error);
      await showHUD("Whoops, something went wrong! Contact support.");
    }
  };

  const handleStopSmartHabit = async (lineageId: string, title: string) => {
    try {
      await showHUD("Stopped Habit: " + stripPlannerEmojis(title));
      const [habit, error] = await fetchPromise(`/smart-habits/planner/${lineageId}/stop`, {
        init: { method: "POST" },
      });
      if (!habit || error) throw error;

      return habit;
    } catch (error) {
      console.error("Error while stopping habit", error);
      await showHUD("Whoops, something went wrong! Contact support.");
    }
  };

  const getEventActions = useCallbackSafeRef((event: Event): EventActions => {
    const isActive = isWithinInterval(new Date(), {
      end: new Date(event.eventEnd),
      start: new Date(event.eventStart),
    });

    const smartHabit: SmartHabit | undefined = event.assist?.seriesLineageId
      ? smartHabitsByLineageIdsMap?.[event.assist.seriesLineageId]
      : undefined;

    const hasRescheduleUnstarted = currentUser?.features.assistSettings.rescheduleUnstarted;

    const isEventManuallyStarted = event.assist?.manuallyStarted;

    const showStart =
      !isActive ||
      (!!isActive &&
        !!hasRescheduleUnstarted &&
        !isEventManuallyStarted &&
        smartHabit?.activeSeries?.rescheduleUnstartedOverride !== false);

    const showRestartStop =
      !!isActive &&
      (!hasRescheduleUnstarted ||
        (!!hasRescheduleUnstarted && !!isEventManuallyStarted) ||
        (!!hasRescheduleUnstarted && smartHabit?.activeSeries?.rescheduleUnstartedOverride === false));

    const eventActions: EventActions = [];

    if (event.onlineMeetingUrl) {
      eventActions.push({
        icon: Icon.Camera,
        title: "Join meeting",
        action: () => {
          open(event.onlineMeetingUrl);
        },
      });
    }

    switch (event.assist?.eventType) {
      case "TASK_ASSIGNMENT":
        if (showStart)
          eventActions.push({
            icon: Icon.Play,
            title: "Start",
            action: async () => {
              if (event.assist?.taskId) await startTask(String(event.assist.taskId));
            },
          });

        if (showRestartStop)
          eventActions.push(
            {
              icon: Icon.Rewind,
              title: "Restart",
              action: async () => {
                if (event.assist?.taskId) await restartTask(String(event.assist.taskId));
              },
            },
            {
              icon: Icon.Stop,
              title: "Stop",
              action: async () => {
                if (event.assist?.taskId) await stopTask(String(event.assist.taskId));
              },
            }
          );

        eventActions.push({
          icon: Icon.Calendar,
          title: "Open in Planner",
          action: () => {
            open(
              `https://app.reclaim.ai/planner?eventId=${event.eventId}&type=task&assignmentId=${event.assist?.taskId}`
            );
          },
        });
        break;
      case "ONE_ON_ONE_ASSIGNMENT":
        eventActions.push({
          icon: Icon.Calendar,
          title: "Open in Planner",
          action: () => {
            open(
              `https://app.reclaim.ai/planner?eventId=${event.eventId}&type=one-on-one&assignmentId=${event.assist?.dailyHabitId}`
            );
          },
        });
        break;
      case "SMART_MEETING":
        eventActions.push({
          icon: Icon.Calendar,
          title: "Open in Planner",
          action: () => {
            open(
              `https://app.reclaim.ai/planner?eventId=${event.eventId}&type=smart-meeting&assignmentId=${event.assist?.seriesLineageId}`
            );
          },
        });
        break;
      case "HABIT_ASSIGNMENT":
        if (isActive)
          eventActions.push(
            {
              icon: Icon.Rewind,
              title: "Restart",
              action: async () => {
                if (event.assist?.dailyHabitId)
                  await handleRestartHabit(String(event.assist?.dailyHabitId), event.title);
              },
            },
            {
              icon: Icon.Stop,
              title: "Stop",
              action: async () => {
                if (event.assist?.dailyHabitId) await handleStopHabit(String(event.assist?.dailyHabitId), event.title);
              },
            }
          );
        else
          eventActions.push({
            icon: Icon.Play,
            title: "Start",
            action: async () => {
              if (event.assist?.dailyHabitId) await handleStartHabit(String(event.assist?.dailyHabitId), event.title);
            },
          });

        eventActions.push({
          icon: Icon.Calendar,
          title: "Open in Planner",
          action: () => {
            open(
              `https://app.reclaim.ai/planner?eventId=${event.eventId}&type=habit&assignmentId=${event.assist?.dailyHabitId}`
            );
          },
        });
        break;
      case "SMART_HABIT":
        if (showRestartStop)
          eventActions.push(
            {
              icon: Icon.Rewind,
              title: "Restart",
              action: async () => {
                if (event.assist?.seriesLineageId)
                  await handleStartOrRestartSmartHabit(String(event.assist?.seriesLineageId), event.title);
              },
            },
            {
              icon: Icon.Stop,
              title: "Stop",
              action: async () => {
                if (event.assist?.seriesLineageId)
                  await handleStopSmartHabit(String(event.assist?.seriesLineageId), event.title);
              },
            }
          );

        if (showStart)
          eventActions.push({
            icon: Icon.Play,
            title: "Start",
            action: async () => {
              if (event.assist?.seriesLineageId)
                await handleStartOrRestartSmartHabit(String(event.assist?.seriesLineageId), event.title);
            },
          });

        eventActions.push({
          icon: Icon.Calendar,
          title: "Open in Planner",
          action: () => {
            open(
              `https://app.reclaim.ai/planner?eventId=${event.eventId}&type=smart-habit&assignmentId=${event.assist?.seriesLineageId}`
            );
          },
        });
        break;
    }

    eventActions.push({
      icon: Icon.Calendar,
      title: "Open in Calendar",
      action: () => {
        open(`${apiUrl}/events/view/${event.key}`);
      },
    });

    return eventActions;
  });

  return {
    getEventActions,
    showFormattedEventTitle,
  };
};
