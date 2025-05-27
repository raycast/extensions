export const getDisplaySize = (bytes: string) => {
  // const mb = Math.round(parseInt(bytes) / 1000 / 1000);
  const mb = Math.round(parseInt(bytes) / 1024 / 1024);

  return mb >= 1000 ? (mb / 1000).toFixed(2) + " GB" : mb + " MB";
};

export const formatSeasonAndEpisodeNumber = (n: string) => {
  return n[1] ? n : "0" + n;
};

export const getTimeDifference = (timestamp: number) => {
  const now = Math.floor(Date.now() / 1000);
  const diffInSeconds = now - timestamp;

  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) {
    // return `${minutes} minute${minutes === 1 ? "" : "s"}`;
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const minutesLeft = minutes % 60;
  if (hours < 24) {
    // return `${hours} hour${hours === 1 ? "" : "s"}`;
    return `${hours}h ${minutesLeft}m`;
  }

  const days = Math.floor(hours / 24);
  const hoursLeft = hours % 24;
  if (days < 30) {
    // return `${days} day${days === 1 ? "" : "s"}`;
    return `${days}d ${hoursLeft}h`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"}`;
  }

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"}`;
};
