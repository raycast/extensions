import { Script } from "../type";

export const dateToTimestamp: Script = {
  info: {
    title: "Date to Timestamp",
    desc: "Converts dates to Unix timestamp",
    type: "all",
    example: "2001-05-22 11:22:00",
  },
  run(input) {
    try {
      const parsedDate = Date.parse(input);
      if (isFinite(parsedDate)) {
        return String(parsedDate / 1000);
      } else {
        throw Error("No Date");
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
