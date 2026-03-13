import { Clipboard, Icon, showToast, Toast } from "@raycast/api";
import { Profile } from "@slack/web-api/dist/response/UsersProfileGetResponse";
import { DndInfoResponse } from "@slack/web-api/dist/response/DndInfoResponse";
import moment from "moment";
import pluralize from "pluralize";
import { SlackStatusPreset, SlackMutatePromise } from "./types";
import { getEmojiForCode } from "./emojis";
import { WebClient } from "@slack/web-api";

function isTomorrowOrAlmostTomorrow(date: moment.Moment) {
  // Slack treats "tomorrow" as 1 minute before midnight, hence this little hack
  return date.add(1, "minute").isSame(moment().add(1, "day"), "day");
}

function isToday(date: moment.Moment) {
  return date.isSame(new Date(), "day");
}

export function getTextForExpiration(expirationTimestamp: number) {
  const expirationDate = moment((expirationTimestamp *= 1000));

  if (moment().isAfter(expirationDate)) {
    return undefined;
  }

  const isTomorrow = isTomorrowOrAlmostTomorrow(expirationDate);
  if (isTomorrow) {
    return "Until tomorrow";
  } else if (!isToday(expirationDate)) {
    return `Until ${expirationDate.format("dddd, MMMM Do, HH:mm")}`;
  }

  const durationInSeconds = expirationDate.diff(moment(), "seconds");
  const duration = moment.duration(durationInSeconds, "seconds");

  const durationInDays = Math.floor(duration.asDays());
  const durationInHours = Math.floor(duration.subtract(durationInDays, "days").asHours());
  const durationInMinutes = Math.floor(duration.subtract(durationInHours, "hours").asMinutes());

  let relativeDuration = "";

  if (durationInHours > 0 && durationInMinutes > 0) {
    relativeDuration += durationInHours + "h " + durationInMinutes + "m ";
  } else if (durationInHours > 0) {
    relativeDuration = pluralize("hour", durationInHours, true);
  } else if (durationInMinutes > 0) {
    relativeDuration = pluralize("minute", durationInMinutes, true);
  } else {
    relativeDuration = "a minute";
  }

  return `Clears in ${relativeDuration}`;
}

export function showToastWithPromise<T>(
  promiseOrFn: Promise<T> | (() => Promise<T>),
  toasts: { loading: string; success: string | ((value: T) => Omit<Toast.Options, "style">); error?: string },
) {
  const promise = typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn;

  showToast({ style: Toast.Style.Animated, title: toasts.loading });

  promise
    .then((p) => {
      if (typeof toasts.success === "function") {
        const toastOptions = toasts.success(p);
        showToast({ style: Toast.Style.Success, ...toastOptions });
      } else {
        showToast({ style: Toast.Style.Success, title: toasts.success });
      }
      return p;
    })
    .catch((e) => {
      showToast({
        style: Toast.Style.Failure,
        title: toasts.error ?? "Something went wrong",
        message: e instanceof Error ? e.message : undefined,
        primaryAction: {
          title: "Copy Logs",
          shortcut: { modifiers: ["cmd", "shift"], key: "c" },
          async onAction(toast) {
            await Clipboard.copy(e.stack ?? e.toString());
            await toast.hide();
          },
        },
      });
    });

  return promise;
}

export function getStatusIcon(profile: Profile | undefined) {
  if (!profile) {
    return undefined;
  }

  if (!profile.status_emoji) {
    return Icon.SpeechBubble;
  }

  return getEmojiForCode(profile.status_emoji);
}

export function getStatusTitle(profile: Profile | undefined) {
  if (!profile) {
    return "";
  }

  if (!profile.status_text) {
    return "No status";
  }

  return profile.status_text;
}

export function getStatusSubtitle(profile: Profile | undefined) {
  if (!profile) {
    return undefined;
  }

  if (!profile.status_expiration) {
    return undefined;
  }

  if (profile.status_expiration === 0) {
    return "Don't clear";
  }

  return getTextForExpiration(profile.status_expiration);
}

export function getStatusPausedNotifications(dnd: DndInfoResponse | undefined) {
  if (!dnd) {
    return undefined;
  }

  // dnd_enabled is always true if there's a DND schedule, whether currently DND or not.
  // snooze_enabled reflects whether notifications are snoozed independent of that schedule, e.g. by this plugin.
  return dnd.snooze_enabled;
}

export function setStatusToPreset({
  slack,
  preset,
  mutate,
}: {
  slack: WebClient;
  preset: SlackStatusPreset;
  mutate: SlackMutatePromise;
}) {
  return showToastWithPromise(
    async () => {
      await setStatusToValues({
        slack: slack,
        mutate: mutate,
        duration: preset.defaultDuration,
        emojiCode: preset.emojiCode,
        statusText: preset.title,
        pauseNotifications: preset.pauseNotifications,
      });
    },
    {
      loading: "Setting status…",
      success: `Set status to ${preset.title}`,
      error: "Failed setting status",
    },
  );
}

export async function setStatusToValues({
  slack,
  mutate,
  duration,
  emojiCode,
  statusText,
  pauseNotifications,
}: {
  slack: WebClient;
  mutate: SlackMutatePromise;
  duration: number;
  emojiCode: string;
  statusText: string;
  pauseNotifications: boolean;
}) {
  let expiration = 0;
  if (duration > 0) {
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + duration);
    expiration = Math.floor(expirationDate.getTime() / 1000);
  }

  const profile: Profile = {
    status_emoji: emojiCode,
    status_text: statusText,
    status_expiration: expiration,
  };

  const promises = [
    slack.users.profile.set({
      profile: JSON.stringify(profile),
    }),
  ];

  if (pauseNotifications) {
    // "Don't clear" is represented as duration 0.
    // We can't set an indefinite duration via API, so we set a long value. The max allowed value is not documented.
    const longSnoozeHours = 12;
    const adjustedDuration = duration || longSnoozeHours * 60;

    promises.push(slack.dnd.setSnooze({ num_minutes: adjustedDuration }));
  } else {
    // Assumption: endSnooze ends a setSnooze without messing with any scheduled DND period, unlike endDnd.
    promises.push(slack.dnd.endSnooze());
  }

  await mutate(Promise.all(promises), {
    optimisticUpdate() {
      return {
        profile,

        dnd: {
          ok: true,
          snooze_enabled: pauseNotifications,
        },
      };
    },
  });
}
