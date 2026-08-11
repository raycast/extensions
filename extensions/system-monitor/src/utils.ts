export { execf, execTail } from "./lib/exec";

export const formatBytes = (bytes: number): string => {
  const decimals = 2;

  if (bytes === 0) {
    return "0 B";
  }

  const k = 1024;
  const dm: number = decimals < 0 ? 0 : decimals;
  const sizes: string[] = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  // Fractional rates (sub-1 B/s) would index below the array; clamp to bytes.
  const i: number = Math.min(Math.max(Math.floor(Math.log(bytes) / Math.log(k)), 0), sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const isObjectEmpty = (obj: object): boolean => {
  for (const property in obj) {
    return false;
  }

  return true;
};

export const convertMsToTime = (milliseconds: number): string => {
  const padTo2Digits = (num: number): string => {
    return num.toString().padStart(2, "0");
  };
  let seconds = Math.floor(milliseconds / 1000);
  let minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  seconds = seconds % 60;
  minutes = minutes % 60;

  return `${padTo2Digits(hours)}:${padTo2Digits(minutes)}:${padTo2Digits(seconds)}`;
};

export const convertMinutesToHours = (minutes: number): string => {
  return `${`0${Math.floor(minutes / 60)}`.slice(-2)}:${`0${minutes % 60}`.slice(-2)}`;
};

export const openActivityMonitorAppleScript = (radioButtonNumber?: number | null): string => {
  if (!radioButtonNumber) {
    return `
    tell application "Activity Monitor"
      activate
    end tell
  `;
  }

  return `
  tell application "Activity Monitor"
    activate
  end tell

  tell application "System Events"
    repeat until exists (window 1 of process "Activity Monitor")
      delay 0.1
    end repeat

    set frontmost of process "Activity Monitor" to true

    tell process "Activity Monitor"
      tell window 1
        tell group 1 of toolbar 1
          tell radio group 1
            click radio button ${radioButtonNumber}
          end tell
        end tell
      end tell
    end tell
  end tell
`;
};

export const formatMegabytesAsGigabytes = (megabytes: number): string => {
  return `${(megabytes / 1024).toFixed(1)} GB`;
};
