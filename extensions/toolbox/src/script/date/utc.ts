import { Script } from "../type";

export const toUtc: Script = {
  info: {
    title: "Date to UTC",
    desc: "Convert dates and timestamps to UTC dates",
    type: "all",
    example: "2001-05-22 11:22:00",
  },
  run(input) {
    try {
      const parsedDate = Date.parse(input);
      if (isFinite(parsedDate)) {
        return new Date(parsedDate).toUTCString();
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
