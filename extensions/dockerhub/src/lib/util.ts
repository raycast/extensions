import { Image } from "@raycast/api";

export const formatDate = (date: string): string => {
  const now = new Date();
  const d = new Date(date);
  const t1 = now.getTime();
  const t2 = d.getTime();

  let time: number;
  let unit: string;
  if (t1 - t2 < 3600000) {
    time = Math.ceil((t1 - t2) / 60000);
    unit = time === 1 ? "minute" : "minutes";
  } else if (t1 - t2 < 3600000 * 24) {
    time = Math.ceil((t1 - t2) / 3600000);
    unit = time === 1 ? "hour" : "hours";
  } else if (t1 - t2 < 3600000 * 24 * 31) {
    time = Math.ceil((t1 - t2) / (3600000 * 24));
    unit = time === 1 ? "day" : "days";
  } else if (t1 - t2 < 3600000 * 24 * 366) {
    if (now.getFullYear() === d.getFullYear()) {
      time = now.getMonth() - d.getMonth();
    } else {
      time = now.getMonth() - d.getMonth() + 12;
    }
    unit = time === 1 ? "month" : "months";
  } else {
    time = now.getFullYear() - d.getFullYear();
    unit = time === 1 ? "year" : "years";
  }
  return `${time} ${unit} ago`;
};

export const formatSize = (size: number): string => {
  if (size < 1024) {
    return `${size}B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)}KB`;
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)}MB`;
  }
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)}GB`;
};

export function mapFromToIcon(from: string | undefined):
  | Image.ImageLike
  | {
      value: Image.ImageLike;
      tooltip: string;
    } {
  switch (from) {
    case "OFFICIAL":
      return { value: { source: "official.png" }, tooltip: "Official" };
    case "VERIFIED PUBLISHER":
      return { value: { source: "verified.png" }, tooltip: "Verified Publisher" };
    case "OPEN SOURCE":
      return { value: { source: "oss.png" }, tooltip: "Open Source Program" };
    case "COMMUNITY":
      return { value: { source: "docker-icon.png" }, tooltip: "Community" };
    default:
      return { source: "docker-icon.png" };
  }
}
