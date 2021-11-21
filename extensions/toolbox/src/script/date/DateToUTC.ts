import { Script } from "../type";

export const dateToUTC: Script = {
  info: {
    title: "Date to UTC",
    desc: "Converts dates and timestamps to UTC dates",
    type: "all",
    example: "2001-05-22 11:22:00",
  },
  run(input) {
    try {
      const parsedDate = Date.parse(input);
      if (isFinite(parsedDate)) {
        return new Date(parsedDate).toUTCString();
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
