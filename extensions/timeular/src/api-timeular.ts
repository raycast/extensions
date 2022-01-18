import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { Activity, Mention, Preferences, Tag, TimeEntry, Tracking } from "./types";
import { date } from "./utils";

const { apiToken } = getPreferenceValues() as Preferences;

export const apiGetCurrentTracking = () =>
  Promise.resolve()
    .then(() => console.debug("api get current tracking"))
    .then(() => fetch("https://api.timeular.com/api/v3/tracking", params))
    .then(resp => resp.json())
    .then(json => (json as { currentTracking: Tracking }).currentTracking);

export const apiStartTracking = ({ activityId, startedAt = new Date() }: { activityId: string; startedAt?: Date }) =>
  Promise.resolve()
    .then(() => console.debug(`api start tracking activityId ${activityId}`))
    .then(() =>
      fetch(
        `https://api.timeular.com/api/v3/tracking/${activityId}/start`,
        makeParams("POST", { startedAt: date(startedAt) })
      )
    )
    .then(resp => resp.json())
    .then(json => json as { currentTracking: Tracking; message?: string })
    .then(json => (json.message ? Promise.reject(new Error(json.message)) : json.currentTracking));

export const apiStopTracking = ({ stoppedAt = new Date() }: { stoppedAt?: Date }) =>
  Promise.resolve()
    .then(() => console.debug("api stop tracking"))
    .then(() =>
      fetch("https://api.timeular.com/api/v3/tracking/stop", makeParams("POST", { stoppedAt: date(stoppedAt) }))
    )
    .then(resp => resp.json())
    .then(json => json as { message: string })
    .then(
      json => json.message && !json.message.includes("at least 1 minute") && Promise.reject(new Error(json.message))
    );

export const apiListAllActivities = () =>
  Promise.resolve()
    .then(() => console.debug("api list all activities"))
    .then(() => fetch("https://api.timeular.com/api/v3/activities", params))
    .then(resp => resp.json())
    .then(json => (json as { activities: Activity[] }).activities);

export const apiListAllTagsAndMentions = () =>
  Promise.resolve()
    .then(() => console.debug("api list all tags and mentions"))
    .then(() => fetch("https://api.timeular.com/api/v3/tags-and-mentions", params))
    .then(resp => resp.json())
    .then(json => json as { tags: Tag[]; mentions: Mention[] });

export const apiGetTimeTrackingEntries = ({ from, to }: { from: Date; to: Date }) =>
  Promise.resolve()
    .then(() => console.debug(`api get time tracking entries from ${from} to ${to}`))
    .then(() => fetch(`https://api.timeular.com/api/v3/report/data/${date(from)}/${date(to)}`, params))
    .then(resp => resp.json())
    .then(json => json as { timeEntries: TimeEntry[]; message?: string })
    .then(json => (json.message ? Promise.reject(new Error(json.message)) : json.timeEntries));

type EditTracking = {
  note?: {
    text: string;
  };
  activityId?: string;
  startedAt?: string;
};

export const apiEditTracking = (body: EditTracking) =>
  Promise.resolve()
    .then(() => console.debug(`api edit tracking with ${JSON.stringify(body)}`))
    .then(() => fetch("https://api.timeular.com/api/v3/tracking", makeParams("PATCH", body)))
    .then(resp => resp.json())
    .then(json => json as { currentTracking: Tracking; message?: string })
    .then(json => (json.message ? Promise.reject(new Error(json.message)) : json.currentTracking));

type CreateTagParams = {
  key?: string;
  label: string;
  scope?: string;
  spaceId: string;
};

export const apiCreateTag = ({ spaceId, label, key, scope = "timeular" }: CreateTagParams) =>
  Promise.resolve()
    .then(() => console.debug(`api creating tag #${label}, spaceId ${spaceId}, key ${key || "auto"} in scope ${scope}`))
    .then(() => fetch("https://api.timeular.com/api/v3/tags", makeParams("POST", { spaceId, label, key, scope })))
    .then(resp => resp.json())
    .then(json => json as Tag);

const makeParams = (method: string, body: unknown) => ({
  headers: {
    ...params.headers,
    "Content-Type": "application/json",
  },
  method,
  body: JSON.stringify(body),
});

const params = {
  headers: {
    Authorization: `Bearer ${apiToken}`,
  },
};

