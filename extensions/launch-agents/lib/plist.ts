import { execFileSync, execSync } from "child_process";
import { userInfo } from "os";

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

const userDomainTarget = (label: string) => `gui/${userInfo().uid}/${label}`;

/**
 * Checks whether the launch agent is loaded, using the `Label` from its plist
 * (which can differ from the file name).
 */
export const isLaunchAgentLoaded = (filePath: string) => {
  try {
    execFileSync("launchctl", ["print", userDomainTarget(getLaunchAgentLabel(filePath))], { stdio: "pipe" });
    return true;
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

export const getLaunchAgentLabel = (filePath: string) => {
  try {
    const label = execFileSync("plutil", ["-extract", "Label", "raw", "-o", "-", filePath], { stdio: "pipe" })
      .toString()
      .trim();
    if (label) return label;
  } catch {
    // Fall back to the file name below
  }
  return (filePath.split("/").pop() || "").replace(/\.plist$/, "");
};

/**
 * Starts a loaded launch agent immediately, regardless of its schedule.
 * Throws if the agent is not loaded or launchctl fails.
 */
export const runLaunchAgent = (label: string) => {
  execFileSync("launchctl", ["kickstart", userDomainTarget(label)], { stdio: "pipe" });
};
