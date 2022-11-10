import { Script } from "../type";

export const dateToTimestamp: Script = {
  info: {
    title: "Date to Timestamp",
    desc: "Convert dates to Unix timestamps",
    type: ["list", "form", "clipboard"],
    example: "2001-05-22 11:22:00",
  },
  run(input) {
    const parsedDate = Date.parse(input);
    if (isFinite(parsedDate)) {
      return String(parsedDate / 1000);
    } else {
      throw Error("Invalid Date format");
    }
  },
};

export const dateToUtc: Script = {
  info: {
    title: "Date to UTC",
    desc: "Convert dates and timestamps to UTC dates",
    type: ["list", "form", "clipboard"],
    example: "2001-05-22 11:22:00",
  },
  run(input) {
    const parsedDate = Date.parse(input);
    if (isFinite(parsedDate)) {
      return new Date(parsedDate).toUTCString();
    } else {
      throw Error("Invalid Date format");
    }
  },
};
