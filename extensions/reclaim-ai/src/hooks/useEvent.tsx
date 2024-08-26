import { Icon, getPreferenceValues, open, showHUD } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { format, isWithinInterval } from "date-fns";
import { useMemo } from "react";
import { Event } from "../types/event";
import { NativePreferences } from "../types/preferences";
import { SmartHabit } from "../types/smart-series";
import { axiosPromiseData } from "../utils/axiosPromise";
import { formatDisplayEventHours, formatDisplayHours } from "../utils/dates";
import { filterMultipleOutDuplicateEvents } from "../utils/events";
import { stripPlannerEmojis } from "../utils/string";
import reclaimApi from "./useApi";
import { useCallbackSafeRef } from "./useCallbackSafeRef";
import { ApiResponseEvents, EventActions } from "./useEvent.types";
import { useSmartHabits } from "./useSmartHabits";
import { useTaskActions } from "./useTask";
import { useUser } from "./useUser";

export const useEvents = ({ start, end }: { start: Date; end: Date }) => {
  const { apiUrl, apiToken } = getPreferenceValues<NativePreferences>();

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    [apiToken]
  );

  const {
    data: events,
    error,
    isLoading,
  } = useFetch<ApiResponseEvents>(
    `${apiUrl}/events?${new URLSearchParams({
      sourceDetails: "true",
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
      allConnected: "true",
    }).toString()}`,
    {
      headers,
      keepPreviousData: true,
    }
  );

  if (error) console.error("Error while fetching Events", error);

  return {
    events: filterMultipleOutDuplicateEvents(events),
    isLoading,
    error,
  };
};

export const useEventActions = () => {
  const { fetcher } = reclaimApi();
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
      const [habit, error] = await axiosPromiseData(fetcher(`/planner/start/habit/${id}`, { method: "POST" }));
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
      const [habit, error] = await axiosPromiseData(fetcher(`/planner/restart/habit/${id}`, { method: "POST" }));
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
      const [habit, error] = await axiosPromiseData(fetcher(`/planner/stop/habit/${id}`, { method: "POST" }));
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
      const [habit, error] = await axiosPromiseData(
        fetcher(`/smart-habits/planner/${lineageId}/start`, { method: "POST" })
      );
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
      const [habit, error] = await axiosPromiseData(
        fetcher(`/smart-habits/planner/${lineageId}/stop`, { method: "POST" })
      );
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
        showStart &&
          eventActions.push({
            icon: Icon.Play,
            title: "Start",
            action: async () => {
              event.assist?.taskId && (await startTask(String(event.assist.taskId)));
            },
          });

        showRestartStop &&
          eventActions.push(
            {
              icon: Icon.Rewind,
              title: "Restart",
              action: async () => {
                event.assist?.taskId && (await restartTask(String(event.assist.taskId)));
              },
            },
            {
              icon: Icon.Stop,
              title: "Stop",
              action: async () => {
                event.assist?.taskId && (await stopTask(String(event.assist.taskId)));
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
        isActive
          ? eventActions.push(
              {
                icon: Icon.Rewind,
                title: "Restart",
                action: async () => {
                  event.assist?.dailyHabitId &&
                    (await handleRestartHabit(String(event.assist?.dailyHabitId), event.title));
                },
              },
              {
                icon: Icon.Stop,
                title: "Stop",
                action: async () => {
                  event.assist?.dailyHabitId &&
                    (await handleStopHabit(String(event.assist?.dailyHabitId), event.title));
                },
              }
            )
          : eventActions.push({
              icon: Icon.Play,
              title: "Start",
              action: async () => {
                event.assist?.dailyHabitId && (await handleStartHabit(String(event.assist?.dailyHabitId), event.title));
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
        showRestartStop &&
          eventActions.push(
            {
              icon: Icon.Rewind,
              title: "Restart",
              action: async () => {
                event.assist?.seriesLineageId &&
                  (await handleStartOrRestartSmartHabit(String(event.assist?.seriesLineageId), event.title));
              },
            },
            {
              icon: Icon.Stop,
              title: "Stop",
              action: async () => {
                event.assist?.seriesLineageId &&
                  (await handleStopSmartHabit(String(event.assist?.seriesLineageId), event.title));
              },
            }
          );

        showStart &&
          eventActions.push({
            icon: Icon.Play,
            title: "Start",
            action: async () => {
              event.assist?.seriesLineageId &&
                (await handleStartOrRestartSmartHabit(String(event.assist?.seriesLineageId), event.title));
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
