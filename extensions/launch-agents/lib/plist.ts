import { execSync } from "child_process";

export const getLaunchAgentRecurrence = (filePath: string) => {
  const plistContent = execSync(`cat ${filePath}`).toString();
  const intervalMatch = plistContent.match(/<key>StartInterval<\/key>\s*<integer>(\d+)<\/integer>/);

  if (intervalMatch) {
    const seconds = parseInt(intervalMatch[1]);
    if (seconds >= 3600) {
      const hours = (seconds / 3600).toFixed(2);
      return `Recurs every ${hours} hour${hours === "1.00" ? "" : "s"}`;
    }
    if (seconds >= 60) {
      const minutes = (seconds / 60).toFixed(2);
      return `Recurs every ${minutes} minute${minutes === "1.00" ? "" : "s"}`;
    }
    return `Recurs every ${seconds} second${seconds === 1 ? "" : "s"}`;
  }

  const calendarIntervalMatch = [...plistContent.matchAll(/<key>Weekday<\/key>\s*<integer>(\d)<\/integer>/g)];
  if (calendarIntervalMatch.length > 0) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const daysOfWeek = calendarIntervalMatch.map((match) => dayNames[parseInt(match[1])]);
    return `Recurs on weekdays: ${daysOfWeek.join(", ")}`;
  }

  return "No recurrence information";
};

export const isLaunchAgentOK = (filePath: string) => {
  try {
    return execSync(`plutil -lint ${filePath}`).toString().includes("OK");
  } catch {
    return false;
  }
};

export const isLaunchAgentLoaded = (filePath: string) => {
  try {
    const result = execSync(`launchctl list | grep $(basename ${filePath} .plist)`, { stdio: "pipe" });
    return result.toString().trim() !== "";
  } catch {
    return false;
  }
};

export const loadLaunchAgent = (filePath: string) => {
  try {
    execSync(`launchctl load ${filePath}`);
  } catch (error) {
    console.error("Error loading file:", error);
  }
};

export const unloadLaunchAgent = (filePath: string) => {
  try {
    execSync(`launchctl unload ${filePath}`);
  } catch (error) {
    console.error("Error unloading file:", error);
  }
};

export const createLaunchAgent = () => {
  const userLaunchAgentsPath = "~/Library/LaunchAgents";
  const fileName = `com.raycast.${Math.random()}`;

  execSync(`mkdir -p ${userLaunchAgentsPath}`);
  execSync(`touch ${userLaunchAgentsPath}/${fileName}.plist`);

  return fileName;
};
