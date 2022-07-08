import { Moment } from "moment-timezone";
import { Location } from "..";

import moment = require("moment-timezone");
export interface Now {
  city: string;
  country: string;
  iso2: string;
  timezone: string;
  time: string;
  time12: string;
  offset: string;
  comparedToMe: string;
}

const comparedToMe = (myNow: Moment, theirNow: Moment) => {
  // you are ahead
  if (myNow.isBefore(theirNow.format("YYYY-MM-DD"), "days")) return "tomorrow";
  // they are ahead
  if (myNow.isAfter(theirNow.format("YYYY-MM-DD"), "days")) return "yesterday";
  // same day
  return "today";
};

const formatDiff = (diff: number): string => {
  const hours = (diff - (diff % 60)) / 60;
  const minutes = diff % 60;

  if (minutes === 0) return `${hours}`;
  return `${hours}:${minutes}`;
};

const offsetToMe = (myNow: Moment, theirNow: Moment): string => {
  const myOffset = myNow.utcOffset();
  const theirOffset = theirNow.utcOffset();

  if (Math.sign(myOffset) === Math.sign(theirOffset)) {
    const diff = Math.abs(myOffset - theirOffset);
    // same time zone
    if (diff === 0) return "";
    // ealier than you
    if (Math.abs(theirOffset) < Math.abs(myOffset)) return `(-${formatDiff(diff)}) `;
    // later than you
    return `(+${formatDiff(diff)}) `;
  } else {
    const diff = Math.abs(myOffset) + Math.abs(theirOffset);
    return `(${("" + Math.sign(theirOffset)).slice(0, -1)}${formatDiff(diff)}) `;
  }
};

export const getNow = (now: string | Date, location: Location): Now => {
  // setup format
  if (typeof now === "string") {
    now = `${moment().format("YYYY-MM-DD")}T${moment(now, ["h:mm A", "h:mmA", "HH:mm", "h A", "hA"]).format("HH:mm")}`;
  }

  const myNow = moment(now);
  const theirNow = myNow.clone().tz(location.timezone);

  return {
    city: location.city,
    country: location.country,
    iso2: location.iso2,
    timezone: location.timezone,
    time: theirNow.format("HH:mm"),
    time12: theirNow.format("hh:mm a"),
    offset: offsetToMe(myNow, theirNow),
    comparedToMe: comparedToMe(myNow, theirNow),
  };
};
