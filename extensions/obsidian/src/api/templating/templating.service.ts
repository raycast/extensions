import { DateTime } from "luxon";
import { Clipboard } from "@raycast/api";
import { getSelectedTextContent, ISO8601_week_no } from "../../utils/utils";
import { DAY_NUMBER_TO_STRING, MONTH_NUMBER_TO_STRING } from "../../utils/constants";

/** both content and template might have templates to apply */
export async function applyTemplates(content: string, template = "") {
  const date = new Date();
  const dateTime = DateTime.now();
  const week = await ISO8601_week_no(date);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const timestamp = Date.now().toString();
  const clipboard = (await Clipboard.readText()) || "";
  const selectedText = (await getSelectedTextContent()) || "";

  const preprocessed = template.includes("{content}")
    ? template // Has {content} e.g. | {hour}:{minute} | {content} |
    : template + content; // Does not have {content}, then add it to the end

  return preprocessed
    .replaceAll("{content}", content) // Replace {content} with content first so that is can be broken out
    .replaceAll(/{.*?}/g, (match) => {
      const key = match.slice(1, -1);
      switch (key) {
        case "S":
        case "u":
        case "SSS":
        case "s":
        case "ss":
        case "uu":
        case "uuu":
        case "m":
        case "mm":
        case "h":
        case "hh":
        case "H":
        case "HH":
        case "Z":
        case "ZZ":
        case "ZZZ":
        case "ZZZZ":
        case "ZZZZZ":
        case "z":
        case "a":
        case "d":
        case "dd":
        case "c":
        case "ccc":
        case "cccc":
        case "ccccc":
        case "E":
        case "EEE":
        case "EEEE":
        case "EEEEE":
        case "L":
        case "LL":
        case "LLL":
        case "LLLL":
        case "LLLLL":
        case "M":
        case "MM":
        case "MMM":
        case "MMMM":
        case "MMMMM":
        case "y":
        case "yy":
        case "yyyy":
        case "yyyyyy":
        case "G":
        case "GG":
        case "GGGGG":
        case "kk":
        case "kkkk":
        case "W":
        case "WW":
        case "n":
        case "nn":
        case "ii":
        case "iiii":
        case "o":
        case "ooo":
        case "q":
        case "qq":
        case "X":
        case "x":
          return dateTime.toFormat(key);
        case "content":
          return content;
        case "time":
          return date.toLocaleTimeString();
        case "date":
          return date.toLocaleDateString();
        case "week":
          return week.toString().padStart(2, "0");
        case "year":
          return date.getFullYear().toString();
        case "month":
          return MONTH_NUMBER_TO_STRING[date.getMonth()];
        case "day":
          return DAY_NUMBER_TO_STRING[date.getDay()];
        case "hour":
          return hours;
        case "minute":
          return minutes;
        case "second":
          return seconds;
        case "millisecond":
          return date.getMilliseconds().toString();
        case "timestamp":
          return timestamp;
        case "zettelkastenID":
          return timestamp;
        case "clipboard":
          return clipboard;
        case "clip":
          return clipboard;
        case "selection":
          return selectedText;
        case "selected":
          return selectedText;
        case "\n":
          return "\n";
        case "newline":
          return "\n";
        case "nl":
          return "\n";
        default:
          return match;
      }
    });
}
