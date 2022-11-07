import { getDailyLogPath } from "./getDailyLogPath";
import * as fs from "fs";

export function createDailyLog(title: string) {
    const date = new Date();
    const dailyLogPath = getDailyLogPath(date);
    const dailyLogTime = date.toLocaleTimeString();
    const dailyLogLine = `- ${dailyLogTime}: ${title}`;
    // create folder if it doesn't exist
    const dailyLogFolder = dailyLogPath.split("/").slice(0, -1).join("/");
    if (!fs.existsSync(dailyLogFolder)) {
        fs.mkdirSync(dailyLogFolder, { recursive: true });
    }
    // create file if it doesn't exist
    if (!fs.existsSync(dailyLogPath)) {
        fs.writeFileSync(dailyLogPath, "");
    }
    // append to file
    fs.appendFileSync(dailyLogPath, dailyLogLine + "\n");
}
