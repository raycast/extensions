export function numberWithCommas(x: number) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export const formatNumber = Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
}).format;

export const getUpdatedText = (updated: string) => {
  const updatedDate = new Date(updated);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - updatedDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} second${diffInSeconds !== 1 ? "s" : ""} ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  } else {
    return updatedDate.toLocaleDateString("en-US");
  }
};

export function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);

  let result = "";

  if (hours > 0) {
    result += `${hours.toString().padStart(2, "0")}:`;
  }

  result += `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return result;
}
