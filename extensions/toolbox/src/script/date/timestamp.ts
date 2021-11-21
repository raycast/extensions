import { Script } from "../type";

export const toTimestamp: Script = {
  info: {
    title: "Date to Timestamp",
    desc: "Convert dates to Unix timestamps",
    type: "all",
    example: "2001-05-22 11:22:00",
  },
  run(input) {
    try {
      const parsedDate = Date.parse(input);
      if (isFinite(parsedDate)) {
        return String(parsedDate / 1000);
      } else {
        throw Error("It's not a date format.");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw Error("error");
      }
    }
  },
};
