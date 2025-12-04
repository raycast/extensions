import { failIfNotOk, post } from "./api";
import { DateTime } from "luxon";

// https://learn.microsoft.com/en-us/graph/api/resources/datetimetimezone?view=graph-rest-beta
interface NativeStatus {
  message?: {
    contentType: "text";
    content: string | null;
  };
  expiryDateTime?: {
    dateTime: string | null; // "2019-04-16T09:00:00"
    timeZone?: string;
  };
}

const never = {
  dateTime: "9999-12-30T23:00:00",
  timeZone: "GMT Standard Time",
};

async function postStatus(status: NativeStatus) {
  const response = await post({
    apiVersion: "beta",
    path: "/me/presence/setStatusMessage",
    body: {
      statusMessage: status,
    },
  });
  await failIfNotOk(response, "Setting status");
}

export async function setStatus(message: string, pinned = false, expiry?: Date | null) {
  await postStatus({
    message: {
      contentType: "text",
      content: message + (pinned ? "<pinnednote></pinnednote>" : ""),
    },
    expiryDateTime: expiry
      ? {
          dateTime: DateTime.fromJSDate(expiry).setZone("GB").toISO({ includeOffset: false }),
          timeZone: "GMT Standard Time",
        }
      : never,
  });
}

export async function clearStatus() {
  await postStatus({
    message: {
      contentType: "text",
      content: null,
    },
  });
}
