import { Script } from "../type";

export const timeToSeconds: Script = {
  info: {
    title: "Time to seconds",
    desc: "Convert hh:mm:ss to seconds",
    type: ["list", "form", "clipboard"],
    example: "11:22:00",
  },
  run(input) {
    const [hours = 0, minutes = 0, seconds = 0] = String(input).split(":");
    const result = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
    if (isFinite(result)) {
      return String(result);
    } else {
      throw Error("Invalid Time Format");
    }
  },
};
