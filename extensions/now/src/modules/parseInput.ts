import moment from "moment";

export const parseInput = (string: string): { location: string; time: string | undefined; isMyTime: boolean } => {
  // define valid formats
  const validFormats = ["HH:mm", "HH.mm", "HH,mm", "H:mmA", "H:mm A", "H.mmA", "H,mm A", "H A", "HA"];
  // setup output shape
  const output: {
    location: string;
    time: undefined | string;
    isMyTime: boolean;
  } = {
    location: "",
    time: undefined,
    isMyTime: true,
  };
  // merge separate am pm with time
  if (/\s(pm|am|PM|AM|Pm|Am)(?=\s|$)/g.test(string)) {
    string = string.trim().replace(/\s(pm|am|PM|AM|Pm|Am)(?=\s|$)/g, "$1");
  }
  // check all parts
  string.split(" ").forEach((part: string, key: number) => {
    if (moment(part, validFormats, true).isValid()) {
      output.time = part;
      // set to their time if time is after location
      if (key > 0) {
        output.isMyTime = false;
      }
    } else {
      output.location = output.location + " " + part;
    }
  });
  // return output
  return {
    location: output.location.trim(),
    time: output.time,
    isMyTime: output.isMyTime,
  };
};
