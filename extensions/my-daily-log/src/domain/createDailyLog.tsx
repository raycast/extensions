import { getDailyLogPath } from "../shared/getDailyLogPath";
import * as fs from "fs";

export function createDailyLog(title: string) {
  const date = new Date();
  const dailyLogPath = getDailyLogPath(date);
  const dailyLogTime = getHourAndMinute(date);
  const dailyLogLine = `- ${dailyLogTime}: ${title}`;
  const dailyLogFolder = dailyLogPath.split("/").slice(0, -1).join("/");
  if (!fs.existsSync(dailyLogFolder)) {
    fs.mkdirSync(dailyLogFolder, { recursive: true });
  }
  if (!fs.existsSync(dailyLogPath)) {
    fs.writeFileSync(dailyLogPath, "");
  }
  fs.appendFileSync(dailyLogPath, dailyLogLine + "\n");
}

function getHourAndMinute(date: Date) {
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}
