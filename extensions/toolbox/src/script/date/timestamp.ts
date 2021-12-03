import { Script } from "../type";

export const toTimestamp: Script = {
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
